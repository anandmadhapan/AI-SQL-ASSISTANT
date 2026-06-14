# Architecture Document — AI SQL Assistant

## Overview

AI SQL Assistant is a full-stack web application that lets users upload tabular datasets (CSV/Excel) and query them using plain English. Gemini 2.5 Flash translates each question into a PostgreSQL SELECT query, executes it against a live database, and returns a natural-language explanation of the results.

---

## High-Level Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                         Browser (React)                        │
│                                                                │
│  ┌──────────────┐    ┌──────────────────────────────────────┐  │
│  │   Home Page   │    │         DatasetDetail Page           │  │
│  │  Upload Zone  │    │  Chat │ Preview │ History tabs       │  │
│  │  Dataset Grid │    │  AI Result Panel + Auto Chart        │  │
│  └──────┬───────┘    └──────────────┬───────────────────────┘  │
│         │  TanStack Query + Axios   │                          │
└─────────┼───────────────────────────┼──────────────────────────┘
          │ HTTP /api/*               │
          ▼ (Vite proxy → :8001)      ▼
┌────────────────────────────────────────────────────────────────┐
│                      FastAPI Backend (:8001)                   │
│                                                                │
│  ┌─────────────────┐    ┌──────────────────────────────────┐  │
│  │ datasetController│    │       queryController            │  │
│  │  POST /upload    │    │  POST /{id}/query                │  │
│  │  GET  /          │    │  GET  /history                   │  │
│  │  GET  /{id}      │    │  DELETE /history                 │  │
│  │  GET  /{id}/preview   └──────────────┬───────────────────┘  │
│  │  DELETE /{id}    │                   │                      │
│  └────────┬─────────┘                  │                      │
│           │                            │                      │
│  ┌────────▼─────────┐    ┌─────────────▼─────────────────┐   │
│  │  upload_service   │    │         ai_service             │   │
│  │  - Parse CSV/Excel│    │  1. SQL generation thread      │   │
│  │  - Type detection │    │  2. Safe SQL executor          │   │
│  │  - Dynamic DDL    │    │  3. Summary generation thread  │   │
│  │  - Batch INSERT   │    │  (thread pool, fresh event     │   │
│  └────────┬─────────┘     │   loops per call)              │   │
│           │               └──────────────┬─────────────────┘   │
└───────────┼──────────────────────────────┼────────────────────┘
            │                              │
            ▼                              ▼
┌───────────────────────┐    ┌─────────────────────────────────┐
│   PostgreSQL (Supabase)│    │   Google Gemini 2.5 Flash       │
│                        │    │   via Google ADK                │
│  t2_dataset_meta       │    │                                 │
│  t2_query_history      │    │  • sql_generator_agent          │
│  t2_data_* (dynamic)   │    │  • summary_agent                │
└───────────────────────┘    └─────────────────────────────────┘
```

---

## Component Breakdown

### Frontend (React + Vite)

| Component | Responsibility |
|-----------|----------------|
| `App.jsx` | Router setup with TanStack Query provider |
| `Layout.jsx` | Navbar, footer, sticky header, responsive shell |
| `Home.jsx` | File upload zone, dataset card grid, stat bar, how-it-works guide |
| `DatasetDetail.jsx` | Three-tab view: AI Chat, Data Preview, Query History |
| `api.js` | Centralized Axios client; proxied through Vite to backend |

State management uses TanStack Query (server state) with React `useState` for local UI state. No global client-side store is needed.

---

### Backend (FastAPI)

**Entry point:** `main.py`
- Loads `.env` before any imports
- Registers CORS middleware (all origins allowed)
- Overrides FastAPI's datetime encoder to serialize timestamps in IST
- Runs `init_tables()` on startup to create system tables

**Route structure:**
```
/datasets  →  datasetController (upload, list, get, preview, delete)
/query     →  queryController   (ask, history, clear)
```

**Services:**

`upload_service.py`
1. Reads CSV or Excel with pandas (tries multiple encodings for CSV)
2. Sanitises column names (lowercases, removes special chars, deduplicates)
3. Maps pandas dtypes → PostgreSQL types
4. Generates a UUID-suffixed table name to avoid collisions
5. Executes `CREATE TABLE` + batch `INSERT` (500 rows/batch) via SQLAlchemy
6. Saves a `DatasetMeta` record with column JSON

`ai_service.py`
1. **SQL generation** — runs Gemini ADK `Agent` in a worker thread with a fresh asyncio event loop; extracts the SQL code block from the response
2. **Safe execution** — strips semicolons, validates the query starts with `SELECT` or `WITH`, executes inside a savepoint, caps rows at 500
3. **Summary generation** — sends first 50 rows as a text table to a second Gemini agent; produces a plain-English explanation
4. **History persistence** — records question, SQL, AI answer, row count, and any errors

All ADK calls are isolated in `ThreadPoolExecutor` threads because Google ADK creates its own event loops internally, which conflicts with FastAPI's event loop.

---

### Database (PostgreSQL)

Two persistent system tables plus one dynamic table per dataset:

- **`t2_dataset_meta`** — dataset registry, column schema JSON, soft-delete flag
- **`t2_query_history`** — full audit log of every query
- **`t2_data_<name>_<uuid>`** — raw data table created on upload, dropped on delete

SQLAlchemy Core (`text()`) is used for dynamic DDL and data queries. SQLAlchemy ORM is used for system tables.

---

### AI Pipeline Detail

```
User question
     │
     ▼
┌─────────────────────────────────────┐
│  Thread 1: SQL Generator Agent      │
│  Model: gemini-2.5-flash            │
│  Prompt: table name + column schema │
│  Output: ```sql SELECT ... ```      │
└──────────────┬──────────────────────┘
               │ extracted SQL
               ▼
┌─────────────────────────────────────┐
│  Safe SQL Executor                  │
│  - Validates SELECT/WITH only       │
│  - Runs in DB savepoint             │
│  - Caps at 500 rows                 │
└──────────────┬──────────────────────┘
               │ rows + columns
               ▼
┌─────────────────────────────────────┐
│  Thread 2: Summary Agent            │
│  Model: gemini-2.5-flash            │
│  Input: question + first 50 rows    │
│  Output: plain-English explanation  │
└──────────────┬──────────────────────┘
               │
               ▼
         API response
  (SQL + explanation + rows)
```

---

## Key Design Decisions

### Thread isolation for ADK
Google ADK creates internal `asyncio` event loops and `ContextVar` chains that conflict with FastAPI's event loop when called directly. Each AI call runs in a `ThreadPoolExecutor` thread with a brand-new event loop that is cleaned up after use.

### Structured error encoding
ADK raises private exception types (e.g. `_ResourceExhaustedError`) that `concurrent.futures` cannot pickle across thread boundaries. Errors are caught inside the thread, serialized to a plain `RuntimeError("ADK_ERROR:code:status:message")` string, then decoded back into user-friendly Markdown on the main thread.

### Dynamic table names
Each dataset gets a unique `t2_data_<name>_<uuid6>` table. This avoids naming conflicts when the same file is uploaded multiple times and makes cleanup straightforward (one `DROP TABLE`).

### Read-only safety
The backend validates that every generated SQL starts with `SELECT` or `WITH` before execution. No destructive SQL can reach the database regardless of what Gemini generates.

### Soft delete
Datasets are marked `is_active = false` rather than immediately deleted. The actual `DROP TABLE` and hard delete happen only when the user explicitly confirms deletion.

---

## Scalability Considerations

- The `ThreadPoolExecutor` is set to 4 workers. Under high load, increase `max_workers` or switch to a task queue (Celery + Redis).
- Row cap of 500 per query result prevents memory exhaustion for large tables.
- Batch inserts (500 rows/batch) keep upload times predictable for large files.
- Vite's dev proxy can be replaced with an nginx reverse proxy in production.
