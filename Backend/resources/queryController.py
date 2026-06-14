"""
Query Controller — Task 2: AI SQL Assistant
Handles natural language → SQL → execute → respond pipeline.
Also exposes query history endpoints.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from models import get_db
from models.models import DatasetMeta, QueryHistory
from services.ai_service import query_dataset, get_query_history
from schemas.dataset import QueryRequest, QueryResponse, QueryHistoryResponse, QueryHistoryItem

router = APIRouter()


# =============================================
# POST /datasets/{dataset_id}/query
# =============================================
@router.post(
    "/{dataset_id}/query",
    response_model=QueryResponse,
    status_code=status.HTTP_200_OK,
    summary="Ask a natural language question about a dataset",
)
async def ask_query(
    dataset_id: int,
    payload: QueryRequest,
    db: Session = Depends(get_db),
):
    """
    Convert a natural language question to SQL, execute it,
    and return a friendly AI-generated answer.

    **Example questions:**
    - Show top 10 customers by revenue
    - Find duplicate records
    - Which month had the highest sales?
    - Show records with missing values
    - What is the average order value?
    """
    if not payload.question.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question cannot be empty.",
        )

    meta = db.query(DatasetMeta).filter(
        DatasetMeta.id == dataset_id,
        DatasetMeta.is_active == True,
    ).first()
    if not meta:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found.")

    try:
        result = await query_dataset(
            db=db,
            dataset_id=meta.id,
            dataset_name=meta.name,
            table_name=meta.table_name,
            columns=meta.columns,
            question=payload.question,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Query failed: {str(exc)}",
        )

    return QueryResponse(**result)


# =============================================
# GET /query/history
# =============================================
@router.get(
    "/history",
    response_model=QueryHistoryResponse,
    summary="Get query history (all datasets)",
)
def list_query_history(
    dataset_id: Optional[int] = Query(None, description="Filter by dataset ID"),
    skip:  int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """Retrieve past queries, most recent first."""
    result = get_query_history(db=db, dataset_id=dataset_id, skip=skip, limit=limit)
    return QueryHistoryResponse(
        total=result["total"],
        history=[QueryHistoryItem.model_validate(h) for h in result["history"]],
    )


# =============================================
# DELETE /query/history
# =============================================
@router.delete(
    "/history",
    status_code=status.HTTP_200_OK,
    summary="Clear query history",
)
def clear_query_history(
    dataset_id: Optional[int] = Query(None, description="Clear history for a specific dataset"),
    db: Session = Depends(get_db),
):
    q = db.query(QueryHistory)
    if dataset_id:
        q = q.filter(QueryHistory.dataset_id == dataset_id)
    deleted = q.delete()
    db.commit()
    return {"message": f"Deleted {deleted} query history record(s)."}
