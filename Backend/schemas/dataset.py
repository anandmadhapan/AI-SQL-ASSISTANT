"""
Pydantic Schemas — Dataset & Query
"""
from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel


# =============================================
# Column Info (nested)
# =============================================
class ColumnInfo(BaseModel):
    name:     str
    dtype:    str
    pg_type:  str
    sample:   List[str] = []


# =============================================
# Dataset Responses
# =============================================
class DatasetResponse(BaseModel):
    id:                int
    name:              str
    table_name:        str
    original_filename: Optional[str] = None
    file_type:         Optional[str] = None
    row_count:         Optional[int] = None
    col_count:         Optional[int] = None
    columns:           List[ColumnInfo] = []
    is_active:         bool
    created_at:        Optional[datetime] = None

    model_config = {"from_attributes": True}


class DatasetListResponse(BaseModel):
    total:    int
    datasets: List[DatasetResponse]


# =============================================
# Preview Response
# =============================================
class PreviewResponse(BaseModel):
    dataset_id:   int
    dataset_name: str
    table_name:   str
    columns:      List[str]
    rows:         List[dict]
    total_rows:   Optional[int] = None


# =============================================
# Query Request / Response
# =============================================
class QueryRequest(BaseModel):
    question: str


class QueryResponse(BaseModel):
    id:            int
    question:      str
    generated_sql: Optional[str] = None
    response:      str
    columns:       Optional[List[str]] = None
    rows:          Optional[List[dict]] = None
    row_count:     int = 0
    error:         Optional[str] = None
    created_at:    Optional[datetime] = None

    model_config = {"from_attributes": True}


# =============================================
# Query History Response
# =============================================
class QueryHistoryItem(BaseModel):
    id:            int
    dataset_id:    int
    dataset_name:  Optional[str] = None
    question:      str
    generated_sql: Optional[str] = None
    ai_response:   Optional[str] = None
    row_count:     Optional[int] = None
    error:         Optional[str] = None
    created_at:    Optional[datetime] = None

    model_config = {"from_attributes": True}


class QueryHistoryResponse(BaseModel):
    total:   int
    history: List[QueryHistoryItem]
