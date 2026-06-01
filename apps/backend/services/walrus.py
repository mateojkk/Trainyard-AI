import os
import json
import logging
import asyncio
import tempfile
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("walrus_service")

SCRIPTS_DIR = Path(__file__).resolve().parent.parent / "scripts"
WALRUS_STORE_SCRIPT = SCRIPTS_DIR / "walrus-store.mjs"
WALRUS_AGGREGATORS = os.getenv(
    "WALRUS_AGGREGATORS",
    "https://aggregator.walrus-mainnet.walrus.space,https://aggregator.walrus-testnet.walrus.space"
).split(",")

async def upload_blob(data: bytes, base_url: str = "") -> str:
    if base_url:
        upload_url = f"{base_url.rstrip('/')}/api/walrus_upload"
        logger.info(f"Attempting Walrus upload via HTTP Node function: {upload_url}")
        import httpx
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(upload_url, content=data, timeout=300.0)
                if response.status_code == 200:
                    result = response.json()
                    blob_id = result.get("blobId")
                    if blob_id:
                        logger.info(f"Blob uploaded successfully via HTTP. ID: {blob_id}")
                        return blob_id
                logger.warning(f"HTTP upload failed (status {response.status_code}): {response.text}")
        except Exception as e:
            logger.warning(f"HTTP upload failed with exception: {str(e)}")

    logger.info("Falling back to local node subprocess execution for Walrus upload...")
    if not WALRUS_STORE_SCRIPT.exists():
        raise RuntimeError(f"walrus-store.mjs not found at {WALRUS_STORE_SCRIPT}")

    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        tmp.write(data)
        tmp_path = tmp.name

    try:
        with open(tmp_path, "rb") as f:
            proc = await asyncio.create_subprocess_exec(
                "node", str(WALRUS_STORE_SCRIPT),
                stdin=f,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(SCRIPTS_DIR),
                env={**os.environ},
            )

        try:
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(), timeout=300.0
            )
        except asyncio.TimeoutError:
            proc.kill()
            raise RuntimeError("walrus-store.mjs timed out after 300s")

        if proc.returncode != 0:
            err = stderr.decode().strip()
            logger.error(f"walrus-store.mjs failed (exit {proc.returncode}): {err}")
            raise RuntimeError(f"Walrus store failed: {err}")

        result = json.loads(stdout.decode().strip())
        blob_id = result.get("blobId")
        if not blob_id:
            raise RuntimeError(f"Unexpected output from walrus-store.mjs: {stdout.decode()}")

        logger.info(f"Blob uploaded successfully. ID: {blob_id}")
        return blob_id

    finally:
        os.unlink(tmp_path)

async def fetch_blob(blob_id: str) -> bytes:
    import httpx
    for aggregator in WALRUS_AGGREGATORS:
        aggregator = aggregator.strip()
        url = f"{aggregator.rstrip('/')}/v1/blobs/{blob_id}"
        logger.info(f"Fetching blob {blob_id} from: {url}")

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, timeout=30.0)
                response.raise_for_status()
                logger.info(f"Blob {blob_id} fetched ({len(response.content)} bytes)")
                return response.content
            except httpx.HTTPStatusError as e:
                logger.warning(f"HTTP {e.response.status_code} from {url}")
                continue
            except httpx.TimeoutException:
                logger.warning(f"Timeout on {url}")
                continue
            except Exception as e:
                logger.warning(f"Failed on {url}: {e}")
                continue

    raise RuntimeError("All Walrus aggregators failed. Check WALRUS_AGGREGATORS env var.")
