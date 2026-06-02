import logging
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from ..database import get_db
from ..services import sui as sui_service
from ..services.auth_sessions import read_session, SESSION_COOKIE_NAME

logger = logging.getLogger("payments_router")
router = APIRouter()

class VerifyPaymentRequest(BaseModel):
    dataset_id: str
    buyer_address: str
    tx_digest: str
    blob_id: str

PAYMENT_RECEIPTS_TABLE = "payment_receipts"

def _session(request):
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    session = read_session(token)
    if not session or not session.get("sub"):
        raise HTTPException(status_code=401, detail="Invalid session")
    return session

@router.post("/verify")
async def verify_payment(payload: VerifyPaymentRequest, request: Request):
    """
    Verifies a Sui mainnet USDC payment transaction.
    If valid, increments the purchase count and returns the decryption key.
    """
    client = get_db()
    if not client:
        raise HTTPException(status_code=500, detail="Database not initialized")

    try:
        _session(request)

        # 1. Retrieve dataset details from Supabase
        response = client.table("datasets").select("*").eq("id", payload.dataset_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Dataset listing not found")
        dataset = response.data[0]

        if payload.blob_id != dataset.get("blob_id"):
            logger.warning(
                "Payment verification blob mismatch: payload=%s dataset=%s",
                payload.blob_id,
                dataset.get("blob_id"),
            )
            return {
                "success": False,
                "error": "Payment verification failed. Check transaction details."
            }

        existing_receipt = (
            client.table(PAYMENT_RECEIPTS_TABLE)
            .select("tx_digest")
            .eq("tx_digest", payload.tx_digest)
            .execute()
        )
        if existing_receipt.data:
            logger.warning("Rejected reused payment digest: %s", payload.tx_digest)
            return {
                "success": False,
                "error": "This payment transaction has already been used."
            }

        # 2. Verify USDC payment on Sui network
        is_verified = await sui_service.verify_payment(
            payload.tx_digest,
            dataset["price_sui"],
            payload.buyer_address,
            dataset["seller_address"],
        )
        if not is_verified:
            logger.warning(f"Payment verification failed for transaction digest: {payload.tx_digest}")
            return {
                "success": False,
                "error": "Payment verification failed. Check transaction details."
            }

        try:
            client.table(PAYMENT_RECEIPTS_TABLE).insert({
                "tx_digest": payload.tx_digest,
                "dataset_id": payload.dataset_id,
                "buyer_address": payload.buyer_address,
                "seller_address": dataset["seller_address"],
                "price_sui": float(dataset["price_sui"]),
            }).execute()
        except Exception as receipt_error:
            if "duplicate" in str(receipt_error).lower() or "23505" in str(receipt_error):
                logger.warning("Rejected concurrently reused payment digest: %s", payload.tx_digest)
                return {
                    "success": False,
                    "error": "This payment transaction has already been used."
                }
            raise

        # 3. Retrieve decryption key from secure keys table
        key_response = client.table("keys").select("*").eq("blob_id", dataset["blob_id"]).execute()
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
