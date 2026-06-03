import json
import logging
import os
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status, Request
from pydantic import BaseModel
from ..database import get_db
from ..services import walrus as walrus_service
from ..services.auth_sessions import read_session, SESSION_COOKIE_NAME

logger = logging.getLogger("datasets_write")
router = APIRouter()

ALLOWED_TYPES = {"zip", "csv", "json", "txt"}
MIN_GASLESS_PRICE_USDC = 0.20
MAX_API_UPLOAD_BYTES = int(os.getenv("MAX_API_UPLOAD_BYTES", str(4 * 1024 * 1024)))
MAX_API_UPLOAD_LABEL = os.getenv("MAX_API_UPLOAD_LABEL", "4MB")
MAX_LISTING_FILE_BYTES = 10 * 1024 * 1024 * 1024

def _session(request):
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token: raise HTTPException(status_code=401, detail="Not authenticated")
    s = read_session(token)
    if not s or not s.get("sub"): raise HTTPException(status_code=401, detail="Invalid session")
    return s

class PriceUpdateRequest(BaseModel):
    price_sui: float

class SellerAddressSyncRequest(BaseModel):
    seller_address: str

@router.post("/upload-blob")
async def upload_blob(request: Request, file: UploadFile = File(...)):
    """
    Receives encrypted bytes from the client and uploads them to Walrus.
    """
    try:
        _session(request)
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > MAX_API_UPLOAD_BYTES:
            raise HTTPException(status_code=400, detail=f"File size exceeds the {MAX_API_UPLOAD_LABEL} upload limit.")
            
        ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
        if ext not in ALLOWED_TYPES:
            raise HTTPException(status_code=400, detail=f"Unsupported file type '.{ext}'. Accepted: {', '.join(sorted(ALLOWED_TYPES))}")
            
        if getattr(file, "size", None) is not None and file.size > MAX_API_UPLOAD_BYTES:
            raise HTTPException(status_code=400, detail=f"File size exceeds the {MAX_API_UPLOAD_LABEL} upload limit.")
            
        data = await file.read()
        if not data:
            raise HTTPException(status_code=400, detail="Empty file upload")
            
        if len(data) > MAX_API_UPLOAD_BYTES:
            raise HTTPException(status_code=400, detail=f"File size exceeds the {MAX_API_UPLOAD_LABEL} upload limit.")
            
        logger.info(f"Received file upload '{file.filename}' of size {len(data)} bytes.")
        base_url = str(request.base_url)
        blob_id = await walrus_service.upload_blob(data, base_url=base_url)
        
        return {
            "blob_id": blob_id,
            "walrus_explorer_url": f"https://walruscan.com/mainnet/blob/{blob_id}"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in upload-blob: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Walrus upload failed: {str(e)}"
        )

@router.post("/upload-preview")
async def upload_preview(request: Request, preview: str = Form(...)):
    """
    Receives the unencrypted preview text from the client and uploads it to Walrus.
    """
    try:
        _session(request)
        if not preview:
            raise HTTPException(status_code=400, detail="Empty preview text")
            
        preview_bytes = preview.encode("utf-8")
        logger.info(f"Received preview text of size {len(preview_bytes)} bytes.")
        base_url = str(request.base_url)
        blob_id = await walrus_service.upload_blob(preview_bytes, base_url=base_url)
        
        return {
            "blob_id": blob_id
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in upload-preview: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Walrus preview upload failed: {str(e)}"
        )

@router.post("/create")
async def create_listing(
    request: Request,
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
        if int(file_size_bytes) > MAX_LISTING_FILE_BYTES:
            raise HTTPException(status_code=400, detail="File size exceeds the 10GB limit.")
        if float(price_sui) < MIN_GASLESS_PRICE_USDC:
            raise HTTPException(
                status_code=400,
                detail=f"Minimum gasless USDC price is {MIN_GASLESS_PRICE_USDC:.2f}.",
            )

        try:
            parsed_tags = json.loads(tags)
            if not isinstance(parsed_tags, list):
                parsed_tags = [tags]
        except Exception:
            parsed_tags = [t.strip() for t in tags.split(",") if t.strip()]

        if file_type not in ALLOWED_TYPES:
            raise HTTPException(status_code=400, detail=f"Unsupported file type '{file_type}'. Accepted: {', '.join(sorted(ALLOWED_TYPES))}")
        session = _session(request)
        seller_sub = session["sub"]

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
            "walrus_explorer_url": f"https://walruscan.com/mainnet/blob/{blob_id}",
            "seller_sub": seller_sub,
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

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create listing in Supabase: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database insert failed: {str(e)}")

@router.patch("/{dataset_id}/price")
async def update_listing_price(dataset_id: str, payload: PriceUpdateRequest, request: Request):
    client = get_db()
    if not client:
        raise HTTPException(status_code=500, detail="Database not initialized")

    session = _session(request)
    if payload.price_sui < MIN_GASLESS_PRICE_USDC:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum gasless USDC price is {MIN_GASLESS_PRICE_USDC:.2f}.",
        )

    try:
        existing = client.table("datasets").select("id,seller_sub").eq("id", dataset_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Dataset listing not found")
        if existing.data[0].get("seller_sub") != session["sub"]:
            raise HTTPException(status_code=403, detail="Only the seller can edit this listing price")

        response = (
            client.table("datasets")
            .update({"price_sui": float(payload.price_sui)})
            .eq("id", dataset_id)
            .execute()
        )
        if not response.data:
            refreshed = client.table("datasets").select("*").eq("id", dataset_id).execute()
            return refreshed.data[0] if refreshed.data else {"id": dataset_id, "price_sui": payload.price_sui}
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update listing price: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Price update failed: {str(e)}")

@router.post("/sync-seller-address")
async def sync_seller_address(payload: SellerAddressSyncRequest, request: Request):
    client = get_db()
    if not client:
        raise HTTPException(status_code=500, detail="Database not initialized")

    session = _session(request)
    seller_address = payload.seller_address.strip().lower()
    if not seller_address.startswith("0x") or len(seller_address) != 66:
        raise HTTPException(status_code=400, detail="Invalid Sui seller address")

    try:
        response = (
            client.table("datasets")
            .update({"seller_address": seller_address})
            .eq("seller_sub", session["sub"])
            .neq("seller_address", seller_address)
            .execute()
        )
        updated_count = len(response.data or [])
        if updated_count:
            logger.info("Synced %s dataset seller address(es) for sub=%s", updated_count, session["sub"])
        return {"success": True, "updated_count": updated_count, "seller_address": seller_address}
    except Exception as e:
        logger.error(f"Failed to sync seller address: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Seller address sync failed: {str(e)}")
