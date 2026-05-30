import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..services import ai as ai_service

logger = logging.getLogger("ai_router")
router = APIRouter()

class DescribeRequest(BaseModel):
    file_name: str
    file_type: str
    file_size_bytes: int
    category: str
    preview_text: str

@router.post("/describe")
async def describe_dataset(payload: DescribeRequest):
    """
    Auto-generates a dataset title, description, and tags using the AI service.
    """
    try:
        metadata = await ai_service.generate_dataset_description(
            file_name=payload.file_name,
            file_type=payload.file_type,
            file_size_bytes=payload.file_size_bytes,
            category=payload.category,
            preview_text=payload.preview_text
        )
        return metadata
    except Exception as e:
        logger.error(f"Error in describe endpoint: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"AI generation failed: {str(e)}"
        )
