import os
import logging
from dotenv import load_dotenv
from .mock_supabase import MockSupabaseClient

load_dotenv()
logger = logging.getLogger("database")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

# Standard Supabase Client import wrapped in try/except in case library is still installing
try:
    from supabase import create_client
except ImportError:
    create_client = None

supabase_client = None

def _use_mock_db(reason: str):
    logger.warning("%s Operating in local JSON Mock DB mode.", reason)
    return MockSupabaseClient()

def _build_client():
    if not SUPABASE_URL or not SUPABASE_KEY:
        return _use_mock_db("SUPABASE_URL/KEY not found.")
    if create_client is None:
        return _use_mock_db("Supabase dependency is not available.")
    try:
        logger.info("Initializing Supabase Client...")
        client = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Supabase Client connected.")
        return client
    except Exception as error:
        logger.error("Supabase connection failed: %s", str(error))
        return _use_mock_db("Falling back after Supabase failure.")

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
