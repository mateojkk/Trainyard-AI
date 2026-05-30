import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..database import get_db
from ..services import sui as sui_service

logger = logging.getLogger("payments_router")
router = APIRouter()

class VerifyPaymentRequest(BaseModel):
    dataset_id: str
    buyer_address: str
    tx_digest: str
    blob_id: str

@router.post("/verify")
async def verify_payment(payload: VerifyPaymentRequest):
    """
    Verifies a Sui mainnet payment transaction.
    If valid, increments the purchase count and returns the decryption key.
    """
    client = get_db()
    if not client:
        raise HTTPException(status_code=500, detail="Database not initialized")

    try:
        # 1. Retrieve dataset details from Supabase
        response = client.table("datasets").select("*").eq("id", payload.dataset_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Dataset listing not found")
        dataset = response.data[0]

        # 2. Verify payment on SUI network
        is_verified = await sui_service.verify_payment(payload.tx_digest, dataset["price_sui"])
        if not is_verified:
            logger.warning(f"Payment verification failed for transaction digest: {payload.tx_digest}")
            return {
                "success": False,
                "error": "Payment verification failed. Check transaction details."
            }

        # 3. Retrieve decryption key from secure keys table
        key_response = client.table("keys").select("*").eq("blob_id", payload.blob_id).execute()
        if not key_response.data:
            logger.error(f"Decryption key not found for blob ID: {payload.blob_id}")
            raise HTTPException(status_code=500, detail="Dataset decryption key is missing on server")
        key_record = key_response.data[0]

        # 4. Increment download count in Supabase
        current_downloads = dataset.get("download_count", 0)
        client.table("datasets").update({
            "download_count": current_downloads + 1
        }).eq("id", payload.dataset_id).execute()

        logger.info(f"Payment verified. Decryption key released for dataset {payload.dataset_id}.")
        return {
            "success": True,
            "key_base64": key_record["key_base64"],
            "iv": dataset["iv"]
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying payment: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal payment verification error: {str(e)}")
