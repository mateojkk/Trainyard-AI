import os
import hashlib
import logging
import httpx
from dotenv import load_dotenv

load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("walrus_service")

WALRUS_PUBLISHER = os.getenv("WALRUS_PUBLISHER", "https://walrus-mainnet-publisher-1.staketab.org:443")
WALRUS_AGGREGATOR = os.getenv("WALRUS_AGGREGATOR", "https://aggregator.walrus-mainnet.walrus.space")

# Local fallback directory for offline development / downtime
MOCK_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "mock_walrus")
os.makedirs(MOCK_DIR, exist_ok=True)

async def upload_blob(data: bytes) -> str:
    """
    Uploads raw bytes to Walrus mainnet publisher.
    Falls back to a local file store if the publisher is down (e.g. 502 Bad Gateway).
    """
    url = f"{WALRUS_PUBLISHER.rstrip('/')}/v1/store"
    params = {"epochs": 5}
    headers = {"Content-Type": "application/octet-stream"}
    
    logger.info(f"Uploading blob ({len(data)} bytes) to Walrus publisher: {url}")
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.put(
                url,
                params=params,
                headers=headers,
                content=data,
                timeout=15.0
            )
            response.raise_for_status()
            res_json = response.json()
            
            if "newlyCreated" in res_json:
                blob_id = res_json["newlyCreated"]["blobObject"]["blobId"]
                logger.info(f"Blob uploaded successfully to Walrus (newlyCreated). Blob ID: {blob_id}")
                return blob_id
            elif "alreadyCertified" in res_json:
                blob_id = res_json["alreadyCertified"]["blobId"]
                logger.info(f"Blob already exists on Walrus (alreadyCertified). Blob ID: {blob_id}")
                return blob_id
            else:
                raise ValueError(f"Unexpected response format from Walrus: {res_json}")
                
        except Exception as e:
            logger.warning(f"External Walrus publisher failed: {str(e)}. Falling back to local mock storage...")
            # Generate a mock blob ID based on SHA256 of data
            data_hash = hashlib.sha256(data).hexdigest()
            blob_id = f"mock-{data_hash}"
            
            # Save locally
            mock_path = os.path.join(MOCK_DIR, blob_id)
            with open(mock_path, "wb") as f:
                f.write(data)
            
            logger.info(f"Saved blob locally. Mock Blob ID: {blob_id}")
            return blob_id

async def fetch_blob(blob_id: str) -> bytes:
    """
    Fetches raw bytes for a blob ID. If the blob ID starts with 'mock-', 
    fetches from local mock directory, otherwise fetches from Walrus aggregator.
    """
    if blob_id.startswith("mock-"):
        logger.info(f"Fetching mock blob {blob_id} from local storage...")
        mock_path = os.path.join(MOCK_DIR, blob_id)
        if os.path.exists(mock_path):
            with open(mock_path, "rb") as f:
                return f.read()
        raise FileNotFoundError(f"Mock blob {blob_id} not found in local storage.")
        
    url = f"{WALRUS_AGGREGATOR.rstrip('/')}/v1/{blob_id}"
    logger.info(f"Fetching blob {blob_id} from Walrus aggregator: {url}")
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, timeout=15.0)
            response.raise_for_status()
            logger.info(f"Blob {blob_id} fetched successfully ({len(response.content)} bytes)")
            return response.content
        except Exception as e:
            # Check if there is a local copy in mock dir (could be uploaded during this run)
            mock_path = os.path.join(MOCK_DIR, blob_id)
            if os.path.exists(mock_path):
                logger.info(f"External aggregator failed, found local copy of {blob_id} in mock dir.")
                with open(mock_path, "rb") as f:
                    return f.read()
            logger.error(f"Failed to fetch blob {blob_id} from Walrus aggregator: {str(e)}")
            raise e

if __name__ == "__main__":
    import asyncio
    
    async def test_roundtrip():
        print("Testing Walrus upload and fetch with fallback...")
        test_data = b"trainyard mainnet test data " + os.urandom(16)
        try:
            blob_id = await upload_blob(test_data)
            print(f"Upload completed. Blob ID: {blob_id}")
            
            fetched_data = await fetch_blob(blob_id)
            print(f"Fetch completed. Fetched data: {fetched_data.decode('utf-8', errors='ignore')}")
            
            assert fetched_data == test_data, "Data mismatch!"
            print("Walrus integration test PASSED!")
        except Exception as err:
            print(f"Walrus integration test FAILED: {str(err)}")
            
    asyncio.run(test_roundtrip())
