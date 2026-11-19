<div align="center">

<h1>AI SQL Assistant</h1>

<p>
  <b>Talk to your data in plain English.</b><br/>
  Upload any CSV or Excel file, ask questions naturally, and get instant SQL queries,<br/>
  live results, and AI-powered insights — powered by <b>Gemini 2.5 Flash</b>.
</p>

<!-- Nav -->
<p>
  <a href="#overview">Overview</a> &nbsp;·&nbsp;
  <a href="#features">Features</a> &nbsp;·&nbsp;
  <a href="#tech-stack">Tech Stack</a> &nbsp;·&nbsp;
  <a href="#getting-started">Getting Started</a> &nbsp;·&nbsp;
  <a href="#usage">Usage</a> &nbsp;·&nbsp;
  <a href="#api-reference">API</a> &nbsp;·&nbsp;
  <a href="#project-structure">Structure</a> &nbsp;·&nbsp;
  <a href="#troubleshooting">Troubleshooting</a>
</p>

</div>

---

## Overview

**AI SQL Assistant** is a full-stack web application that removes the barrier between non-technical users and their data. Instead of writing SQL, users upload a spreadsheet and ask questions like they would to a colleague.

Under the hood, Google Gemini 2.5 Flash generates a precise PostgreSQL query, executes it against a dynamically created table, and returns both a result table and a natural-language explanation — all in seconds.

> **Live flow:** `Upload file → Auto schema detection → Ask in English → Gemini writes SQL → Execute → AI explains results`

---

## Features

<table>
<tr>
<td width="50%">

**Multi-format Upload**
Drag-and-drop CSV, XLSX and XLS files. CSV files are read as UTF-8, falling back to Latin-1 and CP1252.

**Auto Schema Detection**
Column types are inferred from data and mapped to native PostgreSQL types (BIGINT, DOUBLE PRECISION, TEXT, BOOLEAN, TIMESTAMP).

**Natural Language → SQL**
Ask in plain English. Gemini 2.5 Flash, called through Google ADK, writes a PostgreSQL SELECT query for the uploaded table.

**Auto Visualisation**
Results with a text column and a numeric column are drawn as a bar or pie chart with Recharts.

</td>
<td width="50%">

**Query Execution**
The generated SQL runs against PostgreSQL in a read-only transaction, and up to 500 rows come back with a short explanation.

**Query History**
Every question, generated SQL, and AI answer is stored. Replay any past query with one click.

**Read-only Safety**
Generated SQL is treated as untrusted. It must be a single `SELECT` or `WITH` statement with no write keywords, then runs in a PostgreSQL `READ ONLY` transaction with a 10-second timeout that is always rolled back. Optionally it runs as a separate SELECT-only database role. See [Read-only SQL](#read-only-sql).

**Full Dataset Lifecycle**
Upload, preview, query, and delete datasets. Deleting a dataset drops its PostgreSQL table automatically.

</td>
</tr>
</table>

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18, Vite 5 | UI framework and dev server |
| **State / Data** | TanStack Query v5 | Server state, caching, mutations |
| **Charts** | Recharts | Auto bar / pie visualisations |
| **HTTP Client** | Axios | API calls with Vite proxy |
| **Backend** | FastAPI (Python 3.11+) | REST API, async request handling |
| **ORM** | SQLAlchemy 2.0 | System table models + raw SQL execution |
| **Validation** | Pydantic v2 | Request/response schemas |
| **Database** | PostgreSQL (Supabase) | Data storage — system tables + dynamic data tables |
| **AI Model** | Gemini 2.5 Flash | SQL generation + result summarisation |
| **AI Runtime** | Google ADK 0.3+ | Agent orchestration |

---

## Getting Started

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Python | 3.11 or higher |
| Node.js | 18 or higher |
| PostgreSQL | Any (Supabase free tier works) |
| Google AI API Key | [Get one free](https://aistudio.google.com/app/apikey) |

---

### Step 1 — Clone

```bash
git clone https://github.com/anandmadhapan/AI-SQL-ASSISTANT.git
cd AI-SQL-ASSISTANT
```

---

### Step 2 — Backend

```bash
cd Backend

# 1. Create virtual environment
python -m venv venv

# 2. Activate it
venv\Scripts\activate        # Windows
source venv/bin/activate     # macOS / Linux

# 3. Install dependencies
pip install -r requirements.txt

# 4. Set up environment
copy .env.example .env       # Windows
cp .env.example .env         # macOS / Linux
```

Open `.env` and fill in your values:

```env
# ── App ──────────────────────────────────
ASCEND_ENV=dev

# ── PostgreSQL ───────────────────────────
DB_HOST=your-host.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-password

# ── Google Gemini ─────────────────────────
GOOGLE_API_KEY=your-google-api-key

# ── Security ─────────────────────────────
SECRET_KEY=change-this-in-production
```

Start the API server:

```bash
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

| URL | Description |
|-----|-------------|
| http://localhost:8001 | API root |
| http://localhost:8001/docs | Swagger UI (interactive) |
| http://localhost:8001/redoc | ReDoc documentation |

---

### Step 3 — Frontend

```bash
cd Frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Usage

### 1. Upload a dataset

Click **Upload & Analyse**, drop your file, optionally name it, and hit submit. The system will:
- Parse the file
- Detect column types
- Create a dedicated PostgreSQL table
- Return the schema metadata

### 2. Query in plain English

Open any dataset and type your question. Examples:

```
Show the top 10 customers by revenue
Find all duplicate records
What is the average order value per month?
Which product category had the highest sales?
Show records where any column has missing values
Group by region and count the number of orders
```

### 3. Explore results

Each response includes:
- An AI-written natural-language explanation
- The generated SQL (expandable / copyable)
- A scrollable result table
- An auto-generated chart (when data supports it)

### 4. Review history

Switch to the **History** tab to see all past queries for the dataset. Click **Replay** to re-run any question.

---

## API Reference

All endpoints are prefixed with the server base URL (`http://localhost:8001`).

### Datasets

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/datasets/upload` | Upload a CSV or Excel file |
| `GET` | `/datasets` | List all datasets (`?skip=0&limit=50`) |
| `GET` | `/datasets/{id}` | Get dataset metadata |
| `GET` | `/datasets/{id}/preview` | Preview rows (`?limit=100`) |
| `DELETE` | `/datasets/{id}` | Delete dataset + drop table |

### Query

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/query/{id}/query` | Ask a natural-language question |
| `GET` | `/query/history` | Get history (`?dataset_id=&skip=0&limit=50`) |
| `DELETE` | `/query/history` | Clear history (`?dataset_id=` optional) |

### Example request

```bash
curl -X POST http://localhost:8001/query/1/query \
  -H "Content-Type: application/json" \
  -d '{"question": "Show top 5 customers by revenue"}'
```

### Example response

```json
{
  "id": 42,
  "question": "Show top 5 customers by revenue",
  "generated_sql": "SELECT customer_name, SUM(revenue) AS total\nFROM \"t2_data_sales_a1b2c3\"\nGROUP BY customer_name\nORDER BY total DESC\nLIMIT 5",
  "response": "The top customer is **Acme Corp** with $45,000 in total revenue...",
  "columns": ["customer_name", "total"],
  "rows": [
    { "customer_name": "Acme Corp", "total": 45000.0 }
  ],
  "row_count": 5,
  "error": null,
  "created_at": "2025-01-15T12:31:00+05:30"
}
```

---

## Project Structure

```text
AI-SQL-ASSISTANT/
│
├── .gitattributes                  # Enforce LF line endings
├── README.md
│
├── Backend/
│   ├── main.py                     # FastAPI app, CORS, lifespan, IST serialiser
│   ├── requirements.txt
│   ├── .env                        # Secrets — never committed to git
│   ├── .env.example                # Safe template
│   │
│   ├── configs/
│   │   ├── base_config.py          # Base config class (SECRET_KEY, GOOGLE_API_KEY)
│   │   └── dev_config.py           # Dev env — builds DB URI from env vars
│   │
│   ├── models/
│   │   └── models.py               # SQLAlchemy ORM: DatasetMeta, QueryHistory
│   │
│   ├── resources/
│   │   ├── datasetController.py    # POST upload · GET list/detail/preview · DELETE
│   │   └── queryController.py      # POST query · GET history · DELETE history
│   │
│   ├── routes/
│   │   └── __init__.py             # Aggregates dataset + query routers
│   │
│   ├── schemas/
│   │   └── dataset.py              # Pydantic v2 request/response models
│   │
│   └── services/
│       ├── ai_service.py           # Gemini ADK — SQL gen + safe exec + summarise
│       └── upload_service.py       # Parse CSV/Excel → DDL → batch INSERT → meta
│
├── Frontend/
│   ├── index.html
│   ├── vite.config.js              # Vite config + /api proxy → :8001
│   ├── package.json
│   └── src/
│       ├── App.jsx                 # BrowserRouter + QueryClientProvider
│       ├── main.jsx
│       ├── index.css
│       │
│       ├── layouts/
│       │   └── Layout.jsx          # Sticky navbar · footer · responsive shell
│       │
│       ├── pages/
│       │   ├── Home.jsx            # Upload zone · stat bar · dataset card grid
│       │   └── DatasetDetail.jsx   # Chat · Preview · History tabs · auto chart
│       │
│       └── services/
│           └── api.js              # Centralised Axios client (datasetsAPI, queryAPI)
│
└── docs/
    ├── api_documentation.md        # Full endpoint reference
    ├── architecture.md             # System design + AI pipeline diagram
    ├── database_schema.md          # DDL, column types, JSON structure
    └── sample_datasets/
        ├── sales_sample.csv        # 30-row orders dataset
        ├── employees_sample.csv    # 20-row HR dataset
        └── README.md               # Sample query suggestions
```

---

## Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `ASCEND_ENV` | No | Runtime environment | `dev` |
| `DB_HOST` | **Yes** | PostgreSQL hostname | `localhost` |
| `DB_PORT` | No | PostgreSQL port | `5432` |
| `DB_NAME` | No | Database name | `postgres` |
| `DB_USER` | No | Database user | `postgres` |
| `DB_PASSWORD` | **Yes** | Database password | — |
| `GOOGLE_API_KEY` | **Yes** | Google AI / Gemini API key | — |
| `SECRET_KEY` | **Yes** | App secret (change in prod) | `task2-secret-key` |
| `READONLY_DATABASE_URL` | No | Connection URL for a SELECT-only role used to run generated SQL | app connection |
| `AI_SQL_TIMEOUT_MS` | No | Statement timeout for generated SQL | `10000` |

---

## Production Deployment

```bash
# Backend — 4 worker processes
uvicorn main:app --host 0.0.0.0 --port 8001 --workers 4

# Frontend — build and serve static assets
cd Frontend
npm run build
# serve dist/ with nginx, Caddy, Vercel, or any static host
```

**Checklist before going live:**
- [ ] Set `ASCEND_ENV=prod`
- [ ] Use a strong random `SECRET_KEY`
- [ ] Restrict CORS origins in `main.py` (replace `"*"` with your domain)
- [ ] Enable SSL on your PostgreSQL connection
- [ ] Set up rate limiting on the `/query` endpoint

---

## Read-only SQL

`Backend/services/sql_guard.py` runs every generated query through three layers, and any one of them stops a write:

1. **Static check.** One `SELECT` or `WITH` statement only; no `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE`, `CREATE`, `GRANT`, `COPY`, `MERGE` or `INTO`.
2. **Read-only transaction.** The query runs after `SET TRANSACTION READ ONLY` with a statement timeout, and the transaction is always rolled back. PostgreSQL itself then refuses writes, including data-modifying CTEs, `SELECT ... INTO` and `nextval()`.
3. **Read-only role (optional).** Create the role with [`docs/readonly_role.sql`](./docs/readonly_role.sql) and set `READONLY_DATABASE_URL`. The role has SELECT grants only, including on tables created by future uploads.

### Tests

```bash
pip install pytest
cd Backend
pytest tests                                   # static checks only
TEST_DATABASE_URL=postgresql+psycopg2://postgres@localhost:5432/test pytest tests   # adds database tests
```

The database tests need a disposable PostgreSQL database; they create and drop a table called `t_sales`.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `401 / 403` on AI queries | Invalid `GOOGLE_API_KEY` | Check key in `.env`; ensure Gemini API is enabled in Google AI Studio |
| `429 Quota exceeded` | Free-tier rate limit hit | Wait for daily reset or [upgrade your plan](https://ai.google.dev/gemini-api/docs/rate-limits) |
| `Connection refused` on DB | Wrong host/port/password | Verify all `DB_*` vars in `.env`; test connection with `psql` |
| CORS error in browser | Backend not running | Ensure `uvicorn` is on port `8001`; Vite proxy is pre-configured |
| File upload returns `400` | Unsupported format or empty file | Use `.csv`, `.xlsx`, or `.xls` only; check file is not empty |
| Blank chart | Insufficient data shape | Chart needs at least one text column + one numeric column |

---

## Documentation

Detailed documentation is in the [`/docs`](./docs) folder:

- [API Documentation](./docs/api_documentation.md) — all endpoints with request/response examples
- [Architecture](./docs/architecture.md) — system design, AI pipeline, design decisions
- [Database Schema](./docs/database_schema.md) — DDL, type mapping, JSON structure
- [Sample Datasets](./docs/sample_datasets/README.md) — ready-to-use test data

---

## License

MIT. See [LICENSE](LICENSE).
