<div align="center">

<img src="https://img.shields.io/badge/Gemini%202.5%20Flash-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Gemini 2.5 Flash"/>
<img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI"/>
<img src="https://img.shields.io/badge/React%2018-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 18"/>
<img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL"/>
<img src="https://img.shields.io/badge/Python%203.11+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python"/>

<h1>🤖 AI SQL Assistant</h1>

<p><strong>Upload any CSV or Excel dataset — ask questions in plain English — get instant SQL, live results, and AI-powered insights.</strong></p>

<p>
  <a href="#-features">Features</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-usage">Usage</a> •
  <a href="#-api">API</a> •
  <a href="#-project-structure">Structure</a>
</p>

</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📁 **Multi-format Upload** | Drag-and-drop CSV, XLSX, XLS files up to 50 MB |
| 🔍 **Auto Schema Detection** | Column types auto-detected and mapped to PostgreSQL |
| 💬 **Natural Language Queries** | Ask questions in plain English — no SQL knowledge needed |
| ⚡ **Instant SQL Generation** | Gemini 2.5 Flash writes and executes the query in seconds |
| 📊 **Auto Visualisation** | Bar and pie charts generated automatically from results |
| 📜 **Query History** | Full audit trail of every question with replay support |
| 🔒 **Read-only Safety** | Only SELECT/WITH queries permitted — data is never modified |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, TanStack Query, Recharts, Axios |
| **Backend** | FastAPI (Python 3.11+), SQLAlchemy, Pydantic v2 |
| **Database** | PostgreSQL via Supabase |
| **AI** | Google Gemini 2.5 Flash · Google ADK |

---

## 🚀 Quick Start

### Prerequisites

- Python **3.11+**
- Node.js **18+**
- A PostgreSQL database ([Supabase free tier](https://supabase.com) works great)
- A Google AI API key → [Get one here](https://aistudio.google.com/app/apikey)

---

### 1 · Clone the repository

```bash
git clone <your-repo-url>
cd "Anand Task-2"
```

---

### 2 · Backend Setup

```bash
cd Backend

# Create and activate virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
copy .env.example .env        # Windows
# cp .env.example .env        # macOS / Linux
```

Edit `.env` with your credentials:

```env
# Environment
ASCEND_ENV=dev

# PostgreSQL
DB_HOST=your-host.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-password

# Google Gemini
GOOGLE_API_KEY=your-google-api-key

# Security
SECRET_KEY=change-this-in-production
```

Start the server:

```bash
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

> 📘 Interactive API docs: **http://localhost:8001/docs**

---

### 3 · Frontend Setup

```bash
cd Frontend
npm install
npm run dev
```

> 🌐 App runs at **http://localhost:5173**

---

## 📖 Usage

1. **Upload** — Drop a `.csv`, `.xlsx`, or `.xls` file and give it a name
2. **Open** — Click any dataset card to enter the AI chat view
3. **Ask** — Type a question in plain English, for example:

```
Show the top 10 customers by revenue
Find all duplicate records
What is the average order value per month?
Which product category had the highest sales?
Show records with missing values
```

4. **Explore** — View the AI explanation, generated SQL, result table, and auto chart
5. **History** — Revisit or replay any previous query from the History tab

---

## 🌐 API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/datasets/upload` | Upload CSV / Excel file |
| `GET` | `/datasets` | List all datasets |
| `GET` | `/datasets/{id}` | Get dataset metadata |
| `GET` | `/datasets/{id}/preview` | Preview first 100 rows |
| `DELETE` | `/datasets/{id}` | Delete dataset and its table |
| `POST` | `/query/{id}/query` | Ask a natural-language question |
| `GET` | `/query/history` | Get query history |
| `DELETE` | `/query/history` | Clear query history |

Full interactive documentation at `/docs` (Swagger UI) and `/redoc`.

---

## 📁 Project Structure

```text
Anand Task-2/
├── .gitattributes
├── README.md
│
├── Backend/
│   ├── main.py                    # FastAPI app entry point
│   ├── requirements.txt
│   ├── .env                       # Local config — never committed
│   ├── .env.example               # Safe template for new setups
│   ├── configs/
│   │   ├── base_config.py
│   │   └── dev_config.py
│   ├── models/
│   │   └── models.py              # DatasetMeta + QueryHistory ORM models
│   ├── resources/
│   │   ├── datasetController.py   # Upload / list / preview / delete
│   │   └── queryController.py     # NL→SQL query + history
│   ├── routes/
│   │   └── __init__.py            # Route aggregator
│   ├── schemas/
│   │   └── dataset.py             # Pydantic schemas
│   └── services/
│       ├── ai_service.py          # Gemini ADK integration
│       └── upload_service.py      # File parsing + dynamic PG tables
│
├── Frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── App.jsx
│       ├── layouts/Layout.jsx
│       ├── pages/
│       │   ├── Home.jsx           # Upload zone + dataset grid
│       │   └── DatasetDetail.jsx  # Chat / Preview / History tabs
│       └── services/api.js        # Axios API client
│
└── docs/
    ├── api_documentation.md
    ├── architecture.md
    ├── database_schema.md
    └── sample_datasets/
        ├── sales_sample.csv
        └── employees_sample.csv
```

---

## ⚙️ Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ASCEND_ENV` | Environment (`dev` / `prod`) | `dev` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `postgres` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | — |
| `GOOGLE_API_KEY` | Google AI / Gemini API key | — |
| `SECRET_KEY` | App secret key | `task2-secret-key` |

---

## 🏭 Production Deployment

```bash
# Backend — multiple workers
uvicorn main:app --host 0.0.0.0 --port 8001 --workers 4

# Frontend — build static assets then serve dist/ with nginx or Caddy
cd Frontend && npm run build
```

> Set `ASCEND_ENV=prod` and use a strong random `SECRET_KEY` in production.

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| `GOOGLE_API_KEY` auth error | Verify the key in `.env` — ensure it has Gemini API access |
| `429 Quota exceeded` | Free-tier daily limit hit — wait for reset or upgrade plan |
| Database connection refused | Check `DB_HOST`, `DB_PORT`, and `DB_PASSWORD` in `.env` |
| CORS errors in browser | Backend must be on port `8001` — Vite proxy is pre-configured |
| File upload fails | Confirm file is `.csv`, `.xlsx`, or `.xls` and not empty |

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">
  <sub>Built with ❤️ using FastAPI · React · Gemini 2.5 Flash · PostgreSQL</sub>
</div>
