"""
SQLAlchemy ORM Models — Task 2: AI SQL Assistant
System tables only. User-uploaded data lives in dynamically created tables (prefix t2_data_).
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, Boolean
from sqlalchemy.sql import func
from models import Base


# =============================================
# Dataset Metadata Table
# =============================================
class DatasetMeta(Base):
    """Tracks every uploaded CSV/Excel file and its auto-detected schema."""
    __tablename__ = "t2_dataset_meta"

    id                = Column(Integer, primary_key=True, index=True)
    name              = Column(String(255), nullable=False)             # user-friendly name
    table_name        = Column(String(255), nullable=False, unique=True, index=True)
    original_filename = Column(String(255), nullable=True)
    file_type         = Column(String(10),  nullable=True)              # csv / xlsx
    row_count         = Column(Integer, nullable=True)
    col_count         = Column(Integer, nullable=True)
    columns           = Column(JSON, nullable=False)                    # [{name, dtype, pg_type, sample}]
    is_active         = Column(Boolean, nullable=False, default=True)
    created_at        = Column(DateTime(timezone=True), server_default=func.now())
    updated_at        = Column(DateTime(timezone=True), onupdate=func.now())


# =============================================
# Query History Table
# =============================================
class QueryHistory(Base):
    """Audit trail of every NL → SQL query and its result."""
    __tablename__ = "t2_query_history"

    id            = Column(Integer, primary_key=True, index=True)
    dataset_id    = Column(Integer, nullable=False, index=True)
    dataset_name  = Column(String(255), nullable=True)
    question      = Column(Text, nullable=False)
    generated_sql = Column(Text, nullable=True)
    ai_response   = Column(Text, nullable=True)       # final user-facing answer
    result_json   = Column(Text, nullable=True)       # JSON string of rows
    row_count     = Column(Integer, nullable=True)
    error         = Column(Text, nullable=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
