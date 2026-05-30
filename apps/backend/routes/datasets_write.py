import json
import logging
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from ..database import get_db
from ..services import walrus as walrus_service

logger = logging.getLogger("datasets_write")
router = APIRouter()

@router.post("/upload-blob")
async def upload_blob(file: UploadFile = File(...)):
    """
    Receives encrypted bytes from the client and uploads them to Walrus.
    """
    try:
        data = await file.read()
        if not data:
            raise HTTPException(status_code=400, detail="Empty file upload")
            
        logger.info(f"Received file upload '{file.filename}' of size {len(data)} bytes.")
        blob_id = await walrus_service.upload_blob(data)
        
        return {
            "blob_id": blob_id,
            "walrus_explorer_url": f"https://walruscan.com/mainnet/blob/{blob_id}"
        }
    except Exception as e:
        logger.error(f"Error in upload-blob: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Walrus upload failed: {str(e)}"
        )

@router.post("/upload-preview")
async def upload_preview(preview: str = Form(...)):
    """
    Receives the unencrypted preview text from the client and uploads it to Walrus.
    """
    try:
        if not preview:
            raise HTTPException(status_code=400, detail="Empty preview text")
            
        preview_bytes = preview.encode("utf-8")
        logger.info(f"Received preview text of size {len(preview_bytes)} bytes.")
        blob_id = await walrus_service.upload_blob(preview_bytes)
        
        return {
            "blob_id": blob_id
        }
    except Exception as e:
        logger.error(f"Error in upload-preview: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Walrus preview upload failed: {str(e)}"
        )

@router.post("/create")
async def create_listing(
    title: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    price_sui: float = Form(...),
    seller_address: str = Form(...),
    iv: str = Form(...),
    blob_id: str = Form(...),
    preview_blob_id: str = Form(...),
    file_name: str = Form(...),
    file_size_bytes: int = Form(...),
    file_type: str = Form(...),
    tags: str = Form(...),
    key_base64: str = Form(...)
):
    """
    Creates a new dataset listing in Supabase and stores the decryption key in the keys table.
    """
    client = get_db()
    if not client:
        raise HTTPException(status_code=500, detail="Database not initialized")

    try:
        try:
            parsed_tags = json.loads(tags)
            if not isinstance(parsed_tags, list):
                parsed_tags = [tags]
        except Exception:
            parsed_tags = [t.strip() for t in tags.split(",") if t.strip()]

        listing = {
            "title": title,
            "description": description,
            "category": category.lower(),
            "price_sui": float(price_sui),
            "blob_id": blob_id,
            "preview_blob_id": preview_blob_id,
            "iv": iv,
            "seller_address": seller_address,
            "file_name": file_name,
            "file_size_bytes": int(file_size_bytes),
            "file_type": file_type,
            "tags": parsed_tags,
            "walrus_explorer_url": f"https://walruscan.com/mainnet/blob/{blob_id}"
        }

        # Insert metadata listing record
        response = client.table("datasets").insert(listing).execute()
        inserted_listing = response.data[0]

        # Securely store key separately in keys table
        client.table("keys").insert({
            "blob_id": blob_id,
            "key_base64": key_base64
        }).execute()

        logger.info(f"Listing created in Supabase for blob {blob_id}.")
        return inserted_listing

    except Exception as e:
        logger.error(f"Failed to create listing in Supabase: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database insert failed: {str(e)}")
