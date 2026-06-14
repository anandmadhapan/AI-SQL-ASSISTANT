"""
Route Aggregator — Task 2: AI SQL Assistant
"""
from fastapi import APIRouter

from resources.datasetController import router as datasetRouter
from resources.queryController   import router as queryRouter

router = APIRouter()

# =============================================
# Datasets — upload / list / preview / delete
# =============================================
router.include_router(
    datasetRouter,
    prefix="/datasets",
    tags=["Datasets"],
)

# =============================================
# Query — NL→SQL, history
# =============================================
router.include_router(
    queryRouter,
    prefix="/query",
    tags=["Query"],
)
