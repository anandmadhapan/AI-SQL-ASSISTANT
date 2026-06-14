# API Documentation — AI SQL Assistant

**Base URL:** `http://localhost:8001`  
**Interactive Docs:** `http://localhost:8001/docs` (Swagger UI)  
**Alternative Docs:** `http://localhost:8001/redoc`

All responses are JSON. Timestamps are returned in IST (UTC+5:30) ISO 8601 format.

---

## Service Endpoints

### `GET /`
Returns service information.

**Response `200`:**
```json
{
  "service": "AI SQL Assistant",
  "version": "1.0.0",
  "status": "running",
  "docs": "/docs",
  "redoc": "/redoc",
  "timestamp": "2025-01-15T12:30:00+05:30"
}
```

### `GET /health`
Health check.

**Response `200`:**
```json
{
  "status": "healthy",
  "service": "AI SQL Assistant",
  "timestamp": "2025-01-15T12:30:00+05:30"
}
```

---

## Datasets

### `POST /datasets/upload`
Upload a CSV or Excel file. Automatically detects column types, creates a PostgreSQL table, and inserts all rows.

**Request:** `multipart/form-data`

| Field  | Type   | Required | Description                        |
|--------|--------|----------|------------------------------------|
| `file` | File   | Yes      | `.csv`, `.xlsx`, or `.xls`         |
| `name` | String | No       | Friendly dataset name (defaults to filename) |

**Response `201`:**
```json
{
  "id": 1,
  "name": "Sales Q4 2024",
  "table_name": "t2_data_sales_q4_2024_a1b2c3",
  "original_filename": "Sales Q4 2024.csv",
  "file_type": "csv",
  "row_count": 1500,
  "col_count": 8,
  "columns": [
    {
      "name": "customer_id",
      "dtype": "int64",
      "pg_type": "BIGINT",
      "sample": ["1001", "1002", "1003"]
    },
    {
      "name": "revenue",
      "dtype": "float64",
      "pg_type": "DOUBLE PRECISION",
      "sample": ["4500.00", "3200.50"]
    }
  ],
  "is_active": true,
  "created_at": "2025-01-15T12:30:00+05:30"
}
```

**Error responses:**
- `400` — unsupported file type or empty file
- `500` — upload/parsing failure

---

### `GET /datasets`
List all active datasets, newest first.

**Query Parameters:**

| Param   | Type | Default | Description              |
|---------|------|---------|--------------------------|
| `skip`  | int  | `0`     | Pagination offset         |
| `limit` | int  | `50`    | Max results (max `200`)  |

**Response `200`:**
```json
{
  "total": 3,
  "datasets": [
    {
      "id": 3,
      "name": "Inventory 2025",
      ...
    }
  ]
}
```

---

### `GET /datasets/{dataset_id}`
Get metadata for a single dataset.

**Path Parameters:**
- `dataset_id` (int) — dataset ID

**Response `200`:** Single `DatasetResponse` object (same shape as upload response)

**Error responses:**
- `404` — dataset not found

---

### `GET /datasets/{dataset_id}/preview`
Return the first N rows of a dataset.

**Path Parameters:**
- `dataset_id` (int) — dataset ID

**Query Parameters:**

| Param   | Type | Default | Description             |
|---------|------|---------|-------------------------|
| `limit` | int  | `100`   | Max rows (max `500`)    |

**Response `200`:**
```json
{
  "dataset_id": 1,
  "dataset_name": "Sales Q4 2024",
  "table_name": "t2_data_sales_q4_2024_a1b2c3",
  "columns": ["customer_id", "customer_name", "revenue", "order_date"],
  "rows": [
    { "customer_id": 1001, "customer_name": "Acme Corp", "revenue": 4500.0, "order_date": "2024-10-01" }
  ],
  "total_rows": 1500
}
```

---

### `DELETE /datasets/{dataset_id}`
Delete a dataset: drops the dynamic PostgreSQL table and removes the metadata record.

**Path Parameters:**
- `dataset_id` (int) — dataset ID

**Response `200`:**
```json
{
  "message": "Dataset 'Sales Q4 2024' and its table deleted successfully."
}
```

---

## Query

### `POST /query/{dataset_id}/query`
Ask a natural-language question about a dataset.

**Pipeline:** question → Gemini generates SQL → executes SQL → Gemini summarises results → returns answer + table + chart data

**Path Parameters:**
- `dataset_id` (int) — dataset to query

**Request body:**
```json
{
  "question": "Show top 10 customers by revenue"
}
```

**Response `200`:**
```json
{
  "id": 42,
  "question": "Show top 10 customers by revenue",
  "generated_sql": "SELECT customer_name, SUM(revenue) AS total_revenue\nFROM \"t2_data_sales_q4_2024_a1b2c3\"\nGROUP BY customer_name\nORDER BY total_revenue DESC\nLIMIT 10",
  "response": "The top customer is **Acme Corp** with $45,000 in total revenue, followed by **Globex** at $38,500...",
  "columns": ["customer_name", "total_revenue"],
  "rows": [
    { "customer_name": "Acme Corp", "total_revenue": 45000.0 },
    { "customer_name": "Globex",    "total_revenue": 38500.0 }
  ],
  "row_count": 10,
  "error": null,
  "created_at": "2025-01-15T12:31:00+05:30"
}
```

**Safety:** Only `SELECT` and `WITH` queries are permitted. Any attempt to run `INSERT`, `UPDATE`, `DELETE`, `DROP`, or `ALTER` is blocked.

**Error responses:**
- `400` — empty question
- `404` — dataset not found
- `500` — AI or execution failure (structured error in `response` field)

---

### `GET /query/history`
Retrieve past queries, most recent first.

**Query Parameters:**

| Param        | Type | Default | Description                        |
|--------------|------|---------|------------------------------------|
| `dataset_id` | int  | —       | Filter by dataset (optional)        |
| `skip`       | int  | `0`     | Pagination offset                   |
| `limit`      | int  | `50`    | Max results (max `200`)            |

**Response `200`:**
```json
{
  "total": 12,
  "history": [
    {
      "id": 42,
      "dataset_id": 1,
      "dataset_name": "Sales Q4 2024",
      "question": "Show top 10 customers by revenue",
      "generated_sql": "SELECT ...",
      "ai_response": "The top customer is Acme Corp...",
      "row_count": 10,
      "error": null,
      "created_at": "2025-01-15T12:31:00+05:30"
    }
  ]
}
```

---

### `DELETE /query/history`
Clear query history.

**Query Parameters:**

| Param        | Type | Default | Description                        |
|--------------|------|---------|------------------------------------|
| `dataset_id` | int  | —       | Delete history for one dataset only (optional) |

**Response `200`:**
```json
{
  "message": "Deleted 12 query history record(s)."
}
```

---

## Error Response Format

All errors follow this format:
```json
{
  "detail": "Human-readable error message"
}
```

---

## AI Error Handling

Gemini API errors are caught and returned as structured Markdown in the `response` field rather than raw exceptions:

| Error Code | User-facing message |
|------------|---------------------|
| 429 | Quota exceeded — daily free-tier limit with retry hint |
| 401/403 | Invalid or missing `GOOGLE_API_KEY` |
| 404 | Model not available in your region/tier |
| Network | Connection error message |
