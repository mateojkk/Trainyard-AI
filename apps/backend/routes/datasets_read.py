import os
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from ..database import get_db

logger = logging.getLogger("datasets_read")
router = APIRouter()

@router.get("/")
async def get_datasets(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=50)
):
    """
    Retrieves a paginated list of datasets, supporting search filter and categories.
    """
    client = get_db()
    if not client:
        raise HTTPException(status_code=500, detail="Database not initialized")

    query = client.table("datasets").select("*", count="exact")

    if category and category.lower() != "all":
        query = query.eq("category", category.lower())

    if search:
        # P2P substring case-insensitive match on title/description
        query = query.or_(f"title.ilike.%{search}%,description.ilike.%{search}%")

    skip = (page - 1) * limit
    try:
        response = query.order("created_at", desc=True).range(skip, skip + limit - 1).execute()
        return {
            "datasets": response.data,
            "total": response.count if response.count is not None else len(response.data),
            "page": page,
            "limit": limit
        }
    except Exception as e:
        logger.error(f"Error querying datasets from Supabase: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to query datasets: {str(e)}")

@router.get("/{dataset_id}")
async def get_dataset(dataset_id: str):
    """
    Retrieves details for a single dataset listing.
    """
    client = get_db()
    if not client:
        raise HTTPException(status_code=500, detail="Database not initialized")

    try:
        response = client.table("datasets").select("*").eq("id", dataset_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Dataset listing not found")
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving dataset {dataset_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database fetch failed: {str(e)}")

@router.get("/mock-blob/{blob_id}")
async def get_mock_blob(blob_id: str):
    """
    Serves saved mock dataset files locally for testing download/decryption.
    """
    mock_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "mock_walrus")
    file_path = os.path.join(mock_dir, blob_id)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Mock blob not found")
    return FileResponse(file_path, media_type="application/octet-stream")
