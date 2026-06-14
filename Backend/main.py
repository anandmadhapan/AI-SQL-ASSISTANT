"""
Main Entry Point — Task 2: AI SQL Assistant
FastAPI Application
"""
import pathlib
from dotenv import load_dotenv

# Load .env before anything else
load_dotenv(pathlib.Path(__file__).parent / '.env')

from contextlib import asynccontextmanager
from datetime import datetime, timezone, timedelta
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import ENCODERS_BY_TYPE

# =============================================
# IST Datetime Serialization
# =============================================
_IST = timezone(timedelta(hours=5, minutes=30))


def _dt_to_ist(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(_IST).isoformat()


ENCODERS_BY_TYPE[datetime] = _dt_to_ist

# =============================================
# Import App Modules (after env load)
# =============================================
from models import init_tables
from routes import router


# =============================================
# Lifespan
# =============================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_tables()
    yield


# =============================================
# Application
# =============================================
app = FastAPI(
    title="AI SQL Assistant",
    description=(
        "Task 2 — AI SQL Assistant\n\n"
        "Upload any CSV or Excel dataset and query it using natural language.\n\n"
        "**Features:**\n"
        "- Upload CSV / Excel datasets\n"
        "- Auto-detect schema and create PostgreSQL tables dynamically\n"
        "- Natural language → SQL conversion via Gemini 2.5 Flash\n"
        "- Safe query execution with result display\n"
        "- Query history with AI-generated insights\n"
    ),
    version="1.0.0",
    contact={"name": "AI SQL Assistant"},
    license_info={"name": "MIT"},
    lifespan=lifespan,
)

# =============================================
# CORS Middleware
# =============================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================
# Root
# =============================================
@app.get("/", tags=["Service Info"])
def root():
    return {
        "service": "AI SQL Assistant",
        "version": "1.0.0",
        "status":  "running",
        "docs":    "/docs",
        "redoc":   "/redoc",
        "timestamp": datetime.now(timezone.utc),
    }


# =============================================
# Health Check
# =============================================
@app.get("/health", tags=["Health"])
def health():
    return {
        "status":    "healthy",
        "service":   "AI SQL Assistant",
        "timestamp": datetime.now(timezone.utc),
    }


# =============================================
# Include All Routes
# =============================================
app.include_router(router)
