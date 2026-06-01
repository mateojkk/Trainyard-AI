import os
import logging
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger("zkprover_router")
router = APIRouter()

SHINAMI_ZKPROVER_URL = "https://api.us1.shinami.com/sui/zkprover/v1"
SHINAMI_API_KEY = os.getenv("SHINAMI_API_KEY", "")


class ProveRequest(BaseModel):
    jwt: str
    maxEpoch: str
    extendedEphemeralPublicKey: str
    jwtRandomness: str
    salt: str
    keyClaimName: str = "sub"


@router.post("/prove")
async def create_zk_proof(payload: ProveRequest):
    if not SHINAMI_API_KEY:
        # Fallback to check env at runtime
        api_key = os.environ.get("SHINAMI_API_KEY", "")
        if not api_key:
            raise HTTPException(status_code=500, detail="Shinami API key not configured")
    else:
        api_key = SHINAMI_API_KEY

    shinami_payload = {
        "jsonrpc": "2.0",
        "method": "shinami_zkp_createZkLoginProof",
        "params": [
            payload.jwt,
            payload.maxEpoch,
            payload.extendedEphemeralPublicKey,
            payload.jwtRandomness,
            payload.salt,
            payload.keyClaimName,
        ],
        "id": 1,
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                SHINAMI_ZKPROVER_URL,
                headers={
                    "X-API-Key": api_key,
                    "Content-Type": "application/json",
                },
                json=shinami_payload,
                timeout=60.0,
            )
            response.raise_for_status()
            result = response.json()

            if "error" in result:
                err = result["error"]
                error_msg = err.get("message", str(err))
                logger.error(f"Shinami prover error: {error_msg} (code={err.get('code')})")
                raise HTTPException(
                    status_code=502,
                    detail=f"Prover error: {error_msg}",
                )

            return result["result"]
    except httpx.TimeoutException:
        logger.error("Shinami prover request timed out")
        raise HTTPException(status_code=504, detail="Shinami prover request timed out")
    except httpx.HTTPStatusError as e:
        logger.error(f"Shinami prover HTTP error: {e.response.status_code}")
        raise HTTPException(
            status_code=502,
            detail=f"Shinami prover returned HTTP {e.response.status_code}",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Shinami prover request failed: {str(e)}")
        raise HTTPException(status_code=502, detail=f"Prover request failed: {str(e)}")
