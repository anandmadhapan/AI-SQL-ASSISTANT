"""
Dataset Controller — Task 2: AI SQL Assistant
Handles CSV/Excel upload, listing, preview, and deletion.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Query
from sqlalchemy.orm import Session

from models import get_db
from models.models import DatasetMeta
from services.upload_service import upload_dataset, get_preview, delete_dataset
from schemas.dataset import DatasetResponse, DatasetListResponse, PreviewResponse

router = APIRouter()


# =============================================
# POST /datasets/upload
# =============================================
@router.post(
    "/upload",
    response_model=DatasetResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a CSV or Excel file",
)
async def upload(
    file: UploadFile = File(..., description="CSV or Excel file (.csv / .xlsx / .xls)"),
    name: Optional[str] = Form(None, description="Friendly dataset name (optional)"),
    db: Session = Depends(get_db),
):
    """
    Upload a dataset. The system will:
    - Auto-detect column types
    - Create a dedicated PostgreSQL table
    - Insert all rows
    - Return schema metadata
    """
    allowed = (".csv", ".xlsx", ".xls")
    if not any(file.filename.lower().endswith(ext) for ext in allowed):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type. Allowed: {', '.join(allowed)}",
        )

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    try:
        meta = upload_dataset(
            db=db,
            content=content,
            filename=file.filename,
            dataset_name=name,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {str(e)}",
        )

    return meta


# =============================================
# GET /datasets
# =============================================
@router.get(
    "",
    response_model=DatasetListResponse,
    summary="List all uploaded datasets",
)
def list_datasets(
    skip:  int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = (
        db.query(DatasetMeta)
        .filter(DatasetMeta.is_active == True)
        .order_by(DatasetMeta.created_at.desc())
    )
    total    = query.count()
    datasets = query.offset(skip).limit(limit).all()
    return DatasetListResponse(total=total, datasets=datasets)


# =============================================
# GET /datasets/{dataset_id}
# =============================================
@router.get(
    "/{dataset_id}",
    response_model=DatasetResponse,
    summary="Get dataset metadata by ID",
)
def get_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
):
    meta = db.query(DatasetMeta).filter(
        DatasetMeta.id == dataset_id,
        DatasetMeta.is_active == True,
    ).first()
    if not meta:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found.")
    return meta


# =============================================
# GET /datasets/{dataset_id}/preview
# =============================================
@router.get(
    "/{dataset_id}/preview",
    response_model=PreviewResponse,
    summary="Preview first 100 rows of a dataset",
)
def preview_dataset(
    dataset_id: int,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    meta = db.query(DatasetMeta).filter(
        DatasetMeta.id == dataset_id,
        DatasetMeta.is_active == True,
    ).first()
    if not meta:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found.")

    try:
        preview = get_preview(db, meta.table_name, limit=limit)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Preview failed: {str(e)}",
        )

    return PreviewResponse(
        dataset_id=meta.id,
        dataset_name=meta.name,
        table_name=meta.table_name,
        columns=preview["columns"],
        rows=preview["rows"],
        total_rows=preview["total_rows"],
    )


# =============================================
# DELETE /datasets/{dataset_id}
# =============================================
@router.delete(
    "/{dataset_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a dataset and its table",
)
def remove_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
):
    meta = db.query(DatasetMeta).filter(
        DatasetMeta.id == dataset_id,
        DatasetMeta.is_active == True,
    ).first()
    if not meta:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found.")

    try:
        delete_dataset(db, meta)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Delete failed: {str(e)}",
        )

    return {"message": f"Dataset '{meta.name}' and its table deleted successfully."}
