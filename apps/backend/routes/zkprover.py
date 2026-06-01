import os
import logging
import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

load_dotenv()

logger = logging.getLogger("zkprover_router")
router = APIRouter()

SHINAMI_API_KEY = os.getenv("SHINAMI_API_KEY", "")
SHINAMI_ZKPROVER_URL = "https://api.us1.shinami.com/sui/zkprover/v1"

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
        raise HTTPException(status_code=500, detail="Shinami API key not configured")

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
                    "X-API-Key": SHINAMI_API_KEY,
                    "Content-Type": "application/json",
                },
                json=shinami_payload,
                timeout=30.0,
            )
            response.raise_for_status()
            result = response.json()

            if "error" in result:
                logger.error(f"Shinami prover error: {result['error']}")
                raise HTTPException(status_code=502, detail=f"Shinami prover error: {result['error']}")

            return result["result"]
    except httpx.TimeoutException:
        logger.error("Shinami prover request timed out")
        raise HTTPException(status_code=504, detail="Shinami prover request timed out")
    except httpx.HTTPStatusError as e:
        logger.error(f"Shinami prover HTTP error: {e.response.status_code}")
        raise HTTPException(status_code=502, detail=f"Shinami prover returned HTTP {e.response.status_code}")
    except Exception as e:
        logger.error(f"Shinami prover request failed: {str(e)}")
        raise HTTPException(status_code=502, detail=f"Prover request failed: {str(e)}")
