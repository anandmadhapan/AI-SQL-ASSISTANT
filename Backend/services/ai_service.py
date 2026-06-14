"""
AI Service — Task 2: AI SQL Assistant
Uses Google ADK (Gemini 2.5 Flash) to:
  1. Convert natural language → PostgreSQL SELECT query
  2. Execute the query safely
  3. Summarise results into a friendly natural-language answer
  4. Persist to query history

Key design decisions:
- ADK runs in isolated threads with fresh event loops (avoids OTel ContextVar
  crashes inside FastAPI's event loop).
- All ADK/Gemini exceptions are caught INSIDE the thread and re-raised as plain
  RuntimeError with a structured prefix ("ADK_ERROR:code:status:message").
  This sidesteps concurrent.futures pickling issues with private ADK exception
  classes (e.g. _ResourceExhaustedError whose __reduce__ is incomplete).
- _classify_api_error() parses that prefix and returns a clean user-facing msg.
"""
import re
import json
import asyncio
import concurrent.futures
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import text

from models.models import QueryHistory

_APP_NAME = "Task2SQLAssistant"
_USER_ID  = "default_user"
_executor = concurrent.futures.ThreadPoolExecutor(
    max_workers=4, thread_name_prefix="adk-t2"
)


# =============================================
# Helper: Build schema context string
# =============================================
def _build_schema_context(columns: list) -> str:
    lines = []
    for c in columns:
        sample = ", ".join(c.get("sample", []))
        lines.append(f"  - {c['name']} ({c['pg_type']}) — e.g. {sample}")
    return "\n".join(lines)


# =============================================
# Helper: Clean up event loop tasks
# =============================================
def _cleanup_loop(loop: asyncio.AbstractEventLoop) -> None:
    """Cancel all pending tasks and close the loop."""
    try:
        pending = asyncio.all_tasks(loop)
        if pending:
            for t in pending:
                t.cancel()
            loop.run_until_complete(asyncio.gather(*pending, return_exceptions=True))
    except Exception:
        pass
    finally:
        loop.close()


# =============================================
# Helper: Classify ADK / Gemini API errors
# =============================================
def _classify_api_error(raw: str) -> str:
    """
    Parse a "ADK_ERROR:code:status:message" string (produced inside the thread)
    and return a clean user-facing Markdown message.
    Falls back to using raw as-is if it doesn't match the prefix.
    """
    code_str, status, msg = "", "", raw

    if raw.startswith("ADK_ERROR:"):
        parts = raw.split(":", 3)          # ["ADK_ERROR", code, status, msg]
        code_str = parts[1] if len(parts) > 1 else ""
        status   = parts[2] if len(parts) > 2 else ""
        msg      = parts[3] if len(parts) > 3 else raw

    combined = f"{code_str} {status} {msg}".upper()

    # ── 429 Quota / Rate-limit ────────────────────────────────────
    if "429" in combined or "RESOURCE_EXHAUSTED" in combined or "QUOTA" in combined:
        retry_match = re.search(r"retry[^0-9]*([0-9]+(?:\.[0-9]+)?)\s*s", msg, re.IGNORECASE)
        retry_hint  = f" Please retry in ~{int(float(retry_match.group(1)))}s." if retry_match else ""
        return (
            f"⚠️ **Gemini API quota exceeded** — you've hit the free-tier rate limit "
            f"(20 requests/day for gemini-2.5-flash).{retry_hint}\n\n"
            "**To fix this:**\n"
            "- Wait for your daily quota to reset, OR\n"
            "- [Upgrade to a paid Gemini API plan](https://ai.google.dev/gemini-api/docs/rate-limits)"
        )

    # ── 401 / 403 Auth ───────────────────────────────────────────
    if any(x in combined for x in ["401", "403", "PERMISSION_DENIED", "API_KEY", "UNAUTHENTICATED"]):
        return (
            "⚠️ **Gemini API authentication failed** — your `GOOGLE_API_KEY` is invalid or missing.\n\n"
            "Check your `.env` file and make sure `GOOGLE_API_KEY` is set correctly."
        )

    # ── 404 Model not found ───────────────────────────────────────
    if "404" in combined or "NOT_FOUND" in combined:
        return (
            "⚠️ **Gemini model not found** — `gemini-2.5-flash` may not be available "
            "in your region or API tier.\n\n"
            "Try switching to `gemini-1.5-flash` in `ai_service.py`."
        )

    # ── Network / timeout ─────────────────────────────────────────
    if any(x in combined for x in ["CONNECT", "TIMEOUT", "NETWORK", "UNREACHABLE"]):
        return (
            "⚠️ **Network error** — could not reach the Gemini API.\n\n"
            "Check your internet connection and try again."
        )

    # ── Generic fallback ──────────────────────────────────────────
    return f"⚠️ **AI service error** (code {code_str or '?'}): {msg[:400]}"


# =============================================
# ADK: Generate SQL in isolated thread
# =============================================
def _run_sql_agent_in_thread(
    table_name: str,
    schema_ctx: str,
    question: str,
) -> tuple[str, Optional[str]]:
    """
    Runs Gemini ADK in a fresh event loop inside a worker thread.
    Returns (raw_response_text, extracted_sql_or_None).

    On ANY exception the error is caught here (inside the thread), converted
    to a plain RuntimeError("ADK_ERROR:code:status:msg"), and re-raised.
    This prevents concurrent.futures from mangling private ADK exception types
    during cross-thread transfer.
    """
    instruction = (
        "You are an expert PostgreSQL data analyst.\n\n"
        "The user has uploaded a dataset stored in PostgreSQL.\n"
        f'Table name: "{table_name}"\n'
        f"Columns:\n{schema_ctx}\n\n"
        "Rules:\n"
        "1. Generate a valid PostgreSQL SELECT (or WITH) query to answer the question.\n"
        "2. ONLY write SELECT / WITH queries — never INSERT, UPDATE, DELETE, DROP, or ALTER.\n"
        "3. Always wrap SQL in ```sql ... ``` code blocks.\n"
        f'4. Always use the EXACT table name: "{table_name}" — double-quoted.\n'
        "5. Double-quote column names that have spaces or special characters.\n"
        "6. After the SQL, briefly explain what it does in one sentence.\n"
    )

    async def _inner() -> tuple[str, Optional[str]]:
        from google.adk.agents import Agent
        from google.adk.runners import Runner
        from google.adk.sessions import InMemorySessionService
        from google.genai import types as genai_types

        agent = Agent(
            model="gemini-2.5-flash",
            name="sql_generator_agent",
            description="Converts natural language questions into PostgreSQL SELECT queries.",
            instruction=instruction,
        )
        session_service = InMemorySessionService()
        runner = Runner(agent=agent, app_name=_APP_NAME, session_service=session_service)
        sid = f"sql_{table_name[:30]}"
        await session_service.create_session(app_name=_APP_NAME, user_id=_USER_ID, session_id=sid)

        msg = genai_types.Content(role="user", parts=[genai_types.Part(text=question)])
        response_text = ""

        run_iter = runner.run_async(user_id=_USER_ID, session_id=sid, new_message=msg)
        try:
            async for event in run_iter:
                if event.is_final_response():
                    if event.content and event.content.parts:
                        response_text = event.content.parts[0].text or ""
                    break
        finally:
            try:
                await run_iter.aclose()
            except Exception:
                pass

        sql_match = re.search(r"```(?:sql)?\s*([\s\S]*?)```", response_text, re.IGNORECASE)
        sql = sql_match.group(1).strip() if sql_match else None
        return response_text.strip(), sql

    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(_inner())
    except Exception as exc:
        # Encode error attributes into a plain string BEFORE leaving the thread
        code   = getattr(exc, "code",    None)
        status = getattr(exc, "status",  None)
        detail = getattr(exc, "message", None) or str(exc)
        raise RuntimeError(f"ADK_ERROR:{code}:{status}:{detail}") from None
    finally:
        _cleanup_loop(loop)


# =============================================
# ADK: Summarise results in isolated thread
# =============================================
def _run_summary_agent_in_thread(
    question: str,
    sql_result_str: str,
) -> str:
    """
    Ask Gemini to turn raw SQL results into a human-friendly answer.
    Same thread-isolation + error-encoding pattern as the SQL agent.
    """
    prompt = (
        f"The user asked: {question}\n\n"
        f"The database query returned these results:\n{sql_result_str}\n\n"
        "Provide a clear, friendly, concise natural-language answer. "
        "Do not show the raw table or SQL — just answer the question directly."
    )

    async def _inner() -> str:
        from google.adk.agents import Agent
        from google.adk.runners import Runner
        from google.adk.sessions import InMemorySessionService
        from google.genai import types as genai_types

        agent = Agent(
            model="gemini-2.5-flash",
            name="summary_agent",
            description="Summarises SQL query results into natural language.",
            instruction=(
                "You are a helpful data analyst. "
                "Summarise query results clearly in plain English."
            ),
        )
        session_service = InMemorySessionService()
        runner = Runner(agent=agent, app_name=_APP_NAME, session_service=session_service)
        sid = "summary_sess"
        await session_service.create_session(app_name=_APP_NAME, user_id=_USER_ID, session_id=sid)

        msg = genai_types.Content(role="user", parts=[genai_types.Part(text=prompt)])
        response_text = ""

        run_iter = runner.run_async(user_id=_USER_ID, session_id=sid, new_message=msg)
        try:
            async for event in run_iter:
                if event.is_final_response():
                    if event.content and event.content.parts:
                        response_text = event.content.parts[0].text or ""
                    break
        finally:
            try:
                await run_iter.aclose()
            except Exception:
                pass

        return response_text.strip()

    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(_inner())
    except Exception as exc:
        code   = getattr(exc, "code",    None)
        status = getattr(exc, "status",  None)
        detail = getattr(exc, "message", None) or str(exc)
        raise RuntimeError(f"ADK_ERROR:{code}:{status}:{detail}") from None
    finally:
        _cleanup_loop(loop)


# =============================================
# Helper: Safe SQL executor
# =============================================
def _execute_sql_safe(
    db: Session,
    sql: str,
) -> tuple[Optional[list], Optional[list], Optional[str]]:
    """
    Execute a SELECT/WITH query inside a savepoint.
    Returns (columns, rows, error_or_None). Rows capped at 500.
    """
    clean = sql.strip().rstrip(";")
    if not clean.upper().lstrip().startswith(("SELECT", "WITH")):
        return None, None, "Only SELECT / WITH queries are permitted."
    try:
        with db.begin_nested():
            result = db.execute(text(clean))
            rows   = result.fetchall()
            cols   = list(result.keys())
            return cols, [dict(zip(cols, r)) for r in rows[:500]], None
    except Exception as exc:
        return None, None, str(exc)


# =============================================
# Public: query_dataset  (async — FastAPI endpoint)
# =============================================
async def query_dataset(
    db: Session,
    dataset_id: int,
    dataset_name: str,
    table_name: str,
    columns: list,
    question: str,
) -> dict:
    """
    Full pipeline: NL → SQL → execute → summarise → persist history.
    All API errors are surfaced as user-facing messages in the response,
    never silently swallowed.
    """
    loop = asyncio.get_event_loop()
    schema_ctx = _build_schema_context(columns)

    # ── Step 1: Generate SQL ──────────────────────────────────────
    raw_response  = ""
    generated_sql = None
    ai_error_msg  = None

    try:
        raw_response, generated_sql = await loop.run_in_executor(
            _executor,
            _run_sql_agent_in_thread,
            table_name,
            schema_ctx,
            question,
        )
    except RuntimeError as exc:
        # Structured error encoded inside the thread
        ai_error_msg = _classify_api_error(str(exc))
        raw_response = ai_error_msg
    except Exception as exc:
        ai_error_msg = f"⚠️ Unexpected AI error: {exc}"
        raw_response = ai_error_msg

    # ── Step 2: Execute SQL ───────────────────────────────────────
    cols, rows, sql_error = None, None, None
    result_json    = None
    final_response = raw_response
    row_count      = 0

    if generated_sql and not ai_error_msg:
        cols, rows, sql_error = _execute_sql_safe(db, generated_sql)

        if rows is not None:
            row_count   = len(rows)
            result_json = json.dumps(rows, default=str)

            if rows:
                header    = " | ".join(str(c) for c in cols)
                data_rows = "\n".join(
                    " | ".join(str(r.get(c, "")) for c in cols)
                    for r in rows[:50]
                )
                table_str = f"{header}\n{data_rows}"
                if len(rows) > 50:
                    table_str += f"\n... ({len(rows) - 50} more rows)"

                try:
                    summary = await loop.run_in_executor(
                        _executor,
                        _run_summary_agent_in_thread,
                        question,
                        table_str,
                    )
                    if summary:
                        final_response = summary
                except RuntimeError as exc:
                    # Quota hit on summary too — still return the table, just no prose
                    final_response = raw_response or _classify_api_error(str(exc))
                except Exception:
                    pass  # keep raw_response
            else:
                final_response = "The query ran successfully but returned no matching records."

        elif sql_error:
            final_response = f"{raw_response}\n\n⚠️ SQL execution error: {sql_error}"

    # ── Step 3: Persist to history ────────────────────────────────
    stored_error = sql_error or (ai_error_msg if ai_error_msg else None)
    entry = QueryHistory(
        dataset_id   = dataset_id,
        dataset_name = dataset_name,
        question     = question,
        generated_sql= generated_sql,
        ai_response  = final_response,
        result_json  = result_json,
        row_count    = row_count,
        error        = stored_error,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    return {
        "id":            entry.id,
        "question":      question,
        "generated_sql": generated_sql,
        "response":      final_response,
        "columns":       cols,
        "rows":          rows,
        "row_count":     row_count,
        "error":         stored_error,
        "created_at":    entry.created_at,
    }


# =============================================
# Public: get_query_history
# =============================================
def get_query_history(
    db: Session,
    dataset_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
) -> dict:
    query = db.query(QueryHistory)
    if dataset_id:
        query = query.filter(QueryHistory.dataset_id == dataset_id)
    total   = query.count()
    entries = (
        query.order_by(QueryHistory.created_at.desc())
             .offset(skip).limit(limit).all()
    )
    return {"total": total, "history": entries}
