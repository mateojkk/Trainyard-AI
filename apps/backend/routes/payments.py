import logging
from typing import Optional
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

def _get_dataset(client, dataset_id: str):
    response = client.table("datasets").select("*").eq("id", dataset_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Dataset listing not found")
    return response.data[0]

def _get_key_record(client, blob_id: str):
    key_response = client.table("keys").select("*").eq("blob_id", blob_id).execute()
    if not key_response.data:
        logger.error("Decryption key not found for blob ID: %s", blob_id)
        raise HTTPException(status_code=500, detail="Dataset decryption key is missing on server")
    return key_response.data[0]

def _validate_buyer_address(buyer_address: Optional[str]):
    if not buyer_address:
        return ""
    normalized = buyer_address.strip().lower()
    if not normalized:
        return ""
    if not normalized.startswith("0x") or len(normalized) != 66:
        raise HTTPException(status_code=400, detail="Invalid buyer address")
    return normalized

def _receipt_fingerprint(receipt):
    return receipt.get("tx_digest") or f"{receipt.get('dataset_id')}:{receipt.get('buyer_address')}:{receipt.get('created_at')}"

def _find_purchase_receipts(client, dataset_id: Optional[str], session, buyer_address: str = ""):
    receipts = []
    seen = set()

    def add(rows):
        for row in rows or []:
            key = _receipt_fingerprint(row)
            if key in seen:
                continue
            seen.add(key)
            receipts.append(row)

    by_sub = client.table(PAYMENT_RECEIPTS_TABLE).select("*").eq("buyer_sub", session["sub"])
    if dataset_id:
        by_sub = by_sub.eq("dataset_id", dataset_id)
    add(by_sub.execute().data)

    # Compatibility for receipts written before buyer_sub existed. This only
    # works for the current address, but prevents older valid purchases from
    # being orphaned while new receipts are identity-bound.
    if buyer_address:
        by_address = client.table(PAYMENT_RECEIPTS_TABLE).select("*").eq("buyer_address", buyer_address)
        if dataset_id:
            by_address = by_address.eq("dataset_id", dataset_id)
        add(by_address.execute().data)

    return receipts

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
        session = _session(request)

        # 1. Retrieve dataset details from Supabase
        dataset = _get_dataset(client, payload.dataset_id)

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
                "buyer_sub": session["sub"],
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
        key_record = _get_key_record(client, dataset["blob_id"])

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

@router.get("/purchased")
async def purchased_datasets(request: Request, buyer_address: str = ""):
    client = get_db()
    if not client:
        raise HTTPException(status_code=500, detail="Database not initialized")

    try:
        session = _session(request)
        normalized_address = _validate_buyer_address(buyer_address)
        receipts = _find_purchase_receipts(client, None, session, normalized_address)
        receipts.sort(key=lambda r: r.get("created_at") or "", reverse=True)

        dataset_ids = []
        seen_ids = set()
        receipt_by_dataset = {}
        for receipt in receipts:
            dataset_id = receipt.get("dataset_id")
            if not dataset_id or dataset_id in seen_ids:
                continue
            seen_ids.add(dataset_id)
            dataset_ids.append(dataset_id)
            receipt_by_dataset[dataset_id] = receipt

        if not dataset_ids:
            return {"datasets": []}

        datasets_response = client.table("datasets").select("*").in_("id", dataset_ids).execute()
        dataset_by_id = {row["id"]: row for row in datasets_response.data or []}
        datasets = []
        for dataset_id in dataset_ids:
            dataset = dataset_by_id.get(dataset_id)
            receipt = receipt_by_dataset.get(dataset_id)
            if not dataset:
                continue
            datasets.append({
                **dataset,
                "purchase": {
                    "tx_digest": receipt.get("tx_digest"),
                    "purchased_at": receipt.get("created_at"),
                },
            })

        return {"datasets": datasets}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error loading purchased datasets: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Purchased datasets lookup failed: {str(e)}")

@router.get("/access/{dataset_id}")
async def access_purchased_dataset(dataset_id: str, request: Request, buyer_address: str = ""):
    client = get_db()
    if not client:
        raise HTTPException(status_code=500, detail="Database not initialized")

    try:
        session = _session(request)
        normalized_address = _validate_buyer_address(buyer_address)
        receipts = _find_purchase_receipts(client, dataset_id, session, normalized_address)
        if not receipts:
            raise HTTPException(status_code=403, detail="You have not purchased this dataset yet")

        dataset = _get_dataset(client, dataset_id)
        key_record = _get_key_record(client, dataset["blob_id"])
        return {
            "success": True,
            "dataset": dataset,
            "key_base64": key_record["key_base64"],
            "iv": dataset["iv"],
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error granting purchased dataset access: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Purchased dataset access failed: {str(e)}")
