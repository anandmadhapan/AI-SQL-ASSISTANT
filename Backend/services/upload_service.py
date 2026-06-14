"""
Upload Service — Task 2: AI SQL Assistant
Handles CSV/Excel upload:
  1. Parse file with pandas
  2. Auto-detect column types
  3. Create a dynamic PostgreSQL table (t2_data_<name>_<uuid>)
  4. Insert all rows in batches
  5. Save metadata to t2_dataset_meta
"""
import re
import uuid
import pandas as pd
from io import BytesIO
from typing import Optional
from sqlalchemy import text
from sqlalchemy.orm import Session

from models.models import DatasetMeta


# =============================================
# Helpers
# =============================================
def _safe_table_name(name: str) -> str:
    """Generate a unique, safe PostgreSQL table name."""
    base = re.sub(r'[^a-z0-9]', '_', name.lower())
    base = re.sub(r'_+', '_', base).strip('_') or 'dataset'
    uid  = uuid.uuid4().hex[:6]
    return f"t2_data_{base}_{uid}"


def _safe_col_name(col: str) -> str:
    """Sanitise a column name for PostgreSQL."""
    col = re.sub(r'[^a-z0-9]', '_', str(col).lower())
    col = re.sub(r'_+', '_', col).strip('_') or 'col'
    # Escape reserved words
    reserved = {'order', 'group', 'select', 'where', 'table', 'index',
                'user', 'from', 'join', 'limit', 'offset', 'check', 'values'}
    if col in reserved:
        col = f"_{col}"
    return col


def _pg_type(dtype) -> str:
    s = str(dtype)
    if 'int'      in s: return 'BIGINT'
    if 'float'    in s: return 'DOUBLE PRECISION'
    if 'bool'     in s: return 'BOOLEAN'
    if 'datetime' in s: return 'TIMESTAMP WITH TIME ZONE'
    return 'TEXT'


def _read_file(content: bytes, filename: str) -> pd.DataFrame:
    fn = filename.lower()
    if fn.endswith('.csv'):
        for enc in ('utf-8', 'latin-1', 'cp1252'):
            try:
                return pd.read_csv(BytesIO(content), encoding=enc, low_memory=False)
            except UnicodeDecodeError:
                continue
        raise ValueError("Cannot decode CSV — unsupported encoding.")
    elif fn.endswith(('.xlsx', '.xls')):
        return pd.read_excel(BytesIO(content))
    raise ValueError(f"Unsupported file type. Use .csv, .xlsx, or .xls")


def _resolve_duplicate_cols(col_map: dict[str, str]) -> dict[str, str]:
    """Ensure all sanitised column names are unique."""
    used: dict[str, int] = {}
    result: dict[str, str] = {}
    for orig, safe in col_map.items():
        if safe in used.values():
            cnt = sum(1 for v in used.values() if v == safe)
            safe = f"{safe}_{cnt}"
        used[orig] = safe
        result[orig] = safe
    return result


# =============================================
# Public: upload_dataset
# =============================================
def upload_dataset(
    db: Session,
    content: bytes,
    filename: str,
    dataset_name: Optional[str] = None,
) -> DatasetMeta:
    """
    Parse the file, create a PG table, insert data, save metadata.
    Returns the persisted DatasetMeta object.
    """
    # ── 1. Parse ──────────────────────────────────────────────────
    df = _read_file(content, filename)
    df = df.where(pd.notnull(df), None)   # NaN → None

    # ── 2. Sanitise columns ────────────────────────────────────────
    raw_col_map = {c: _safe_col_name(c) for c in df.columns}
    col_map     = _resolve_duplicate_cols(raw_col_map)
    df.rename(columns=col_map, inplace=True)

    # ── 3. Build column metadata ───────────────────────────────────
    columns_meta = []
    for col in df.columns:
        sample = [str(v) for v in df[col].dropna().head(3).tolist()]
        columns_meta.append({
            "name":    col,
            "dtype":   str(df[col].dtype),
            "pg_type": _pg_type(df[col].dtype),
            "sample":  sample,
        })

    # ── 4. Generate unique table name ─────────────────────────────
    base_name  = re.sub(r'\.[^.]+$', '', filename)   # strip extension
    table_name = _safe_table_name(base_name)
    file_type  = filename.rsplit('.', 1)[-1].lower() if '.' in filename else 'csv'

    # ── 5. CREATE TABLE ────────────────────────────────────────────
    col_defs = ", ".join(f'"{c["name"]}" {c["pg_type"]}' for c in columns_meta)
    create_sql = (
        f'CREATE TABLE IF NOT EXISTS "{table_name}" '
        f'(id SERIAL PRIMARY KEY, {col_defs})'
    )
    db.execute(text(create_sql))
    db.commit()

    # ── 6. INSERT rows (batch 500) ─────────────────────────────────
    if not df.empty:
        col_names    = ", ".join(f'"{c["name"]}"' for c in columns_meta)
        placeholders = ", ".join(f":{c['name']}" for c in columns_meta)
        insert_sql   = f'INSERT INTO "{table_name}" ({col_names}) VALUES ({placeholders})'
        rows         = df.to_dict(orient='records')
        for i in range(0, len(rows), 500):
            db.execute(text(insert_sql), rows[i:i + 500])
        db.commit()

    # ── 7. Save metadata ───────────────────────────────────────────
    friendly_name = dataset_name.strip() if dataset_name else base_name
    meta = DatasetMeta(
        name=friendly_name,
        table_name=table_name,
        original_filename=filename,
        file_type=file_type,
        row_count=len(df),
        col_count=len(df.columns),
        columns=columns_meta,
        is_active=True,
    )
    db.add(meta)
    db.commit()
    db.refresh(meta)
    return meta


# =============================================
# Public: get_preview
# =============================================
def get_preview(db: Session, table_name: str, limit: int = 100) -> dict:
    """Return column names + first N rows from a dynamic table."""
    result = db.execute(text(f'SELECT * FROM "{table_name}" LIMIT :lim'), {"lim": limit})
    rows   = result.fetchall()
    cols   = list(result.keys())
    total  = db.execute(text(f'SELECT COUNT(*) FROM "{table_name}"')).scalar()
    return {
        "columns":   cols,
        "rows":      [dict(zip(cols, row)) for row in rows],
        "total_rows": total,
    }


# =============================================
# Public: delete_dataset
# =============================================
def delete_dataset(db: Session, meta: DatasetMeta) -> None:
    """Drop the dynamic table and remove the metadata record."""
    db.execute(text(f'DROP TABLE IF EXISTS "{meta.table_name}"'))
    db.delete(meta)
    db.commit()
