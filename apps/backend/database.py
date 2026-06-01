import os
import logging
from dotenv import load_dotenv
load_dotenv()
logger = logging.getLogger("database")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

try:
    from supabase import create_client as _supabase_create_client
except ImportError:
    _supabase_create_client = None

supabase_client = None

def _build_client():
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set")
    if _supabase_create_client is None:
        raise RuntimeError("supabase package is not installed")
    try:
        logger.info("Initializing Supabase Client...")
        client = _supabase_create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Supabase Client connected.")
        return client
    except Exception as error:
        logger.error("Supabase connection failed: %s", str(error))
        raise

async def connect_db():
    global supabase_client
    supabase_client = _build_client()

async def close_db():
    pass

def get_db():
    global supabase_client
    if supabase_client is None:
        supabase_client = _build_client()
    return supabase_client
