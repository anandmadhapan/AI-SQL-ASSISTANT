from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import QueuePool
from configs import Configuration

# =============================================
# Database Setup
# =============================================
SQLALCHEMY_DATABASE_URL = Configuration.DB_URI

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
    poolclass=QueuePool,
    connect_args={"sslmode": "require"},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# =============================================
# Dependency
# =============================================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# =============================================
# Init Tables
# =============================================
def init_tables():
    """Create all Task-2 system tables if they do not exist."""
    from models.models import (  # noqa: F401
        DatasetMeta,
        QueryHistory,
    )
    Base.metadata.create_all(bind=engine)
    print("Task 2 — DB tables created / verified.")
