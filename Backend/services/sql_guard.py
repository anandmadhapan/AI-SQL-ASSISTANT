"""
Read-only execution for AI-generated SQL.

The model writes the SQL, so the code treats it as untrusted. Three layers,
each of which stops a write on its own:

  1. A static check: exactly one SELECT / WITH statement, no write keywords
     and no blocked tables.
  2. A PostgreSQL READ ONLY transaction with a statement timeout, always
     rolled back. PostgreSQL itself rejects INSERT, UPDATE, DELETE, DDL,
     SELECT INTO and nextval() inside it, including in data-modifying CTEs.
  3. Optionally, a separate login role with SELECT-only grants, used when
     READONLY_DATABASE_URL is set. See docs/readonly_role.sql.
"""
import os
import re
from typing import Any, List, Sequence, Tuple

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

STATEMENT_TIMEOUT_MS = int(os.getenv("AI_SQL_TIMEOUT_MS", "10000"))

# Words that only appear in statements that write or change the schema.
# String literals containing them are rejected too; the database layers are
# the real guarantee, this check just fails fast with a clear message.
_WRITE_KEYWORDS = re.compile(
    r"\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|COPY|MERGE|INTO)\b",
    re.IGNORECASE,
)

BLOCKED_IDENTIFIERS: Tuple[str, ...] = ()


class ReadOnlyQueryError(ValueError):
    """The SQL was rejected before reaching the database."""


def check_read_only(sql: str, blocked: Sequence[str] = BLOCKED_IDENTIFIERS) -> str:
    """Return the cleaned statement, or raise ReadOnlyQueryError."""
    clean = sql.strip().rstrip(";").strip()
    if not clean.upper().startswith(("SELECT", "WITH")):
        raise ReadOnlyQueryError("Only SELECT / WITH queries are permitted.")
    if ";" in clean:
        raise ReadOnlyQueryError("Only a single SQL statement is permitted.")
    if _WRITE_KEYWORDS.search(clean):
        raise ReadOnlyQueryError("Only read-only SELECT / WITH queries are permitted.")
    for name in blocked:
        if re.search(rf"\b{re.escape(name)}\b", clean, re.IGNORECASE):
            raise ReadOnlyQueryError(f"Queries on '{name}' are not allowed.")
    return clean


_readonly_engine: Engine = None


def _engine_for(db: Session) -> Engine:
    """Use the SELECT-only role when configured, otherwise the app's engine."""
    global _readonly_engine
    url = os.getenv("READONLY_DATABASE_URL")
    if not url:
        return db.get_bind()
    if _readonly_engine is None:
        _readonly_engine = create_engine(url, pool_pre_ping=True)
    return _readonly_engine


def run_read_only_query(db: Session, sql: str) -> Tuple[List[str], List[Any]]:
    """Run one validated statement in a READ ONLY transaction and roll it back."""
    clean = check_read_only(sql)
    with _engine_for(db).connect() as conn:
        trans = conn.begin()
        try:
            conn.execute(text("SET TRANSACTION READ ONLY"))
            conn.execute(text(f"SET LOCAL statement_timeout = {STATEMENT_TIMEOUT_MS}"))
            result = conn.execute(text(clean))
            return list(result.keys()), result.fetchall()
        finally:
            trans.rollback()
