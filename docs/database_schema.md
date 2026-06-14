# Database Schema — AI SQL Assistant

## Overview

The system uses two **system tables** (always present) and a dynamic set of **data tables** (one per uploaded dataset, prefixed `t2_data_`).

---

## System Tables

### `t2_dataset_meta`

Tracks every uploaded file and its auto-detected schema.

| Column              | Type                      | Constraints              | Description                                        |
|---------------------|---------------------------|--------------------------|----------------------------------------------------|
| `id`                | `INTEGER`                 | PK, auto-increment       | Unique dataset identifier                          |
| `name`              | `VARCHAR(255)`            | NOT NULL                 | User-friendly dataset name                         |
| `table_name`        | `VARCHAR(255)`            | NOT NULL, UNIQUE, INDEX  | Dynamic PG table name (e.g. `t2_data_sales_a1b2c3`)|
| `original_filename` | `VARCHAR(255)`            | nullable                 | Original uploaded filename                         |
| `file_type`         | `VARCHAR(10)`             | nullable                 | `csv`, `xlsx`, or `xls`                            |
| `row_count`         | `INTEGER`                 | nullable                 | Number of data rows                                |
| `col_count`         | `INTEGER`                 | nullable                 | Number of columns                                  |
| `columns`           | `JSON`                    | NOT NULL                 | Array of `{name, dtype, pg_type, sample[]}` objects|
| `is_active`         | `BOOLEAN`                 | NOT NULL, default `true` | Soft-delete flag                                   |
| `created_at`        | `TIMESTAMP WITH TIME ZONE`| server default `now()`   | Upload timestamp                                   |
| `updated_at`        | `TIMESTAMP WITH TIME ZONE`| auto on update           | Last modified timestamp                            |

**`columns` JSON structure:**
```json
[
  {
    "name":    "customer_id",
    "dtype":   "int64",
    "pg_type": "BIGINT",
    "sample":  ["1001", "1002", "1003"]
  },
  {
    "name":    "revenue",
    "dtype":   "float64",
    "pg_type": "DOUBLE PRECISION",
    "sample":  ["4500.00", "3200.50", "8100.75"]
  }
]
```

---

### `t2_query_history`

Audit trail of every natural-language query and its result.

| Column          | Type                      | Constraints            | Description                              |
|-----------------|---------------------------|------------------------|------------------------------------------|
| `id`            | `INTEGER`                 | PK, auto-increment     | Unique query record identifier           |
| `dataset_id`    | `INTEGER`                 | NOT NULL, INDEX        | References `t2_dataset_meta.id` (logical)|
| `dataset_name`  | `VARCHAR(255)`            | nullable               | Denormalized dataset name                |
| `question`      | `TEXT`                    | NOT NULL               | Original natural-language question       |
| `generated_sql` | `TEXT`                    | nullable               | SQL produced by Gemini                   |
| `ai_response`   | `TEXT`                    | nullable               | Final user-facing answer (Markdown)      |
| `result_json`   | `TEXT`                    | nullable               | JSON string of returned rows (max 500)   |
| `row_count`     | `INTEGER`                 | nullable               | Number of rows returned                  |
| `error`         | `TEXT`                    | nullable               | SQL or AI error message, if any          |
| `created_at`    | `TIMESTAMP WITH TIME ZONE`| server default `now()` | Query timestamp                          |

---

## Dynamic Data Tables

For each uploaded dataset a table is auto-created with this pattern:

```
t2_data_<sanitised_filename>_<6-char-uuid>
```

Example: uploading `Sales Q4.csv` → table `t2_data_sales_q4_a1b2c3`

**Structure:**

```sql
CREATE TABLE "t2_data_sales_q4_a1b2c3" (
    id              SERIAL PRIMARY KEY,
    customer_id     BIGINT,
    customer_name   TEXT,
    revenue         DOUBLE PRECISION,
    order_date      TIMESTAMP WITH TIME ZONE,
    is_active       BOOLEAN
);
```

Column type mapping from pandas dtype:

| Pandas dtype    | PostgreSQL type            |
|-----------------|----------------------------|
| `int32`, `int64`| `BIGINT`                   |
| `float32`, `float64` | `DOUBLE PRECISION`    |
| `bool`          | `BOOLEAN`                  |
| `datetime64`    | `TIMESTAMP WITH TIME ZONE` |
| `object` / other| `TEXT`                     |

---

## DDL

```sql
-- Dataset metadata
CREATE TABLE t2_dataset_meta (
    id                SERIAL PRIMARY KEY,
    name              VARCHAR(255) NOT NULL,
    table_name        VARCHAR(255) NOT NULL UNIQUE,
    original_filename VARCHAR(255),
    file_type         VARCHAR(10),
    row_count         INTEGER,
    col_count         INTEGER,
    columns           JSON NOT NULL,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at        TIMESTAMP WITH TIME ZONE
);
CREATE INDEX ix_t2_dataset_meta_table_name ON t2_dataset_meta (table_name);

-- Query history
CREATE TABLE t2_query_history (
    id            SERIAL PRIMARY KEY,
    dataset_id    INTEGER NOT NULL,
    dataset_name  VARCHAR(255),
    question      TEXT NOT NULL,
    generated_sql TEXT,
    ai_response   TEXT,
    result_json   TEXT,
    row_count     INTEGER,
    error         TEXT,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX ix_t2_query_history_dataset_id ON t2_query_history (dataset_id);
```
