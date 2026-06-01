import logging
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger("zkprover_router")
router = APIRouter()

# Mysten Labs public zkLogin prover (replaces sunset Shinami service)
MYSTEN_PROVER_URL = "https://prover.mystenlabs.com/v1"


class ProveRequest(BaseModel):
    jwt: str
    maxEpoch: str
    extendedEphemeralPublicKey: str
    jwtRandomness: str
    salt: str
    keyClaimName: str = "sub"


@router.post("/prove")
async def create_zk_proof(payload: ProveRequest):
    prover_payload = {
        "jwt": payload.jwt,
        "extendedEphemeralPublicKey": payload.extendedEphemeralPublicKey,
        "maxEpoch": payload.maxEpoch,
        "jwtRandomness": payload.jwtRandomness,
        "salt": payload.salt,
        "keyClaimName": payload.keyClaimName,
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                MYSTEN_PROVER_URL,
                headers={"Content-Type": "application/json"},
                json=prover_payload,
                timeout=60.0,
            )
            result = response.json()

            if not response.is_success:
                error_msg = result.get("message", result.get("name", str(result)))
                logger.error(f"Prover error ({response.status_code}): {error_msg}")
                raise HTTPException(
                    status_code=502,
                    detail=f"Prover error: {error_msg}",
                )

            return result
    except httpx.TimeoutException:
        logger.error("Prover request timed out")
        raise HTTPException(status_code=504, detail="Prover request timed out")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Prover request failed: {str(e)}")
        raise HTTPException(status_code=502, detail=f"Prover request failed: {str(e)}")
