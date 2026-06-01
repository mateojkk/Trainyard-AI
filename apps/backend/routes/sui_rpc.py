import os, logging
from fastapi import APIRouter, HTTPException
import httpx

logger = logging.getLogger("sui_rpc")
router = APIRouter()
TATUM_API_KEY = os.getenv("TATUM_API_KEY", "")
SUI_MAINNET_RPC = os.getenv("SUI_MAINNET_RPC", "")

@router.post("")
async def proxy_sui_rpc(payload: dict):
    if not SUI_MAINNET_RPC:
        raise HTTPException(status_code=500, detail="SUI_MAINNET_RPC not configured")
    headers = {"Content-Type": "application/json"}
    if TATUM_API_KEY:
        headers["x-api-key"] = TATUM_API_KEY
    async with httpx.AsyncClient() as c:
        resp = await c.post(SUI_MAINNET_RPC, headers=headers, json=payload, timeout=30)
        body = resp.json()
        if not isinstance(body, dict) or ("result" not in body and "error" not in body):
            logger.warning("unexpected Tatum response: status=%d body=%.200s", resp.status_code, str(body))
        return body
