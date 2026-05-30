import os
import logging
import uuid
import json
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("database")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

# Standard Supabase Client import wrapped in try/except in case library is still installing
try:
    from supabase import create_client, Client
except ImportError:
    Client = None

class MockSupabaseTable:
    def __init__(self, name: str):
        self.name = name
        self.db_dir = os.path.join(os.path.dirname(__file__), "mock_db")
        os.makedirs(self.db_dir, exist_ok=True)
        self.file_path = os.path.join(self.db_dir, f"{name}.json")
        self._load()

    def _load(self):
        if os.path.exists(self.file_path):
            try:
                with open(self.file_path, "r") as f:
                    self.data = json.load(f)
            except Exception:
                self.data = []
        else:
            self.data = []

    def _save(self):
        with open(self.file_path, "w") as f:
            json.dump(self.data, f, indent=2, default=str)

    def insert(self, payload):
        if isinstance(payload, list):
            inserted = []
            for item in payload:
                item_copy = dict(item)
                if "id" not in item_copy:
                    item_copy["id"] = str(uuid.uuid4())
                if "created_at" not in item_copy:
                    item_copy["created_at"] = datetime.utcnow().isoformat()
                self.data.append(item_copy)
                inserted.append(item_copy)
            self._save()
            return MockResponse(inserted)
        else:
            item_copy = dict(payload)
            if "id" not in item_copy:
                item_copy["id"] = str(uuid.uuid4())
            if "created_at" not in item_copy:
                item_copy["created_at"] = datetime.utcnow().isoformat()
            self.data.append(item_copy)
            self._save()
            return MockResponse([item_copy])

    def select(self, columns="*", count=None):
        return MockQuery(self, self.data, count=count)

    def update(self, payload):
        return MockUpdateQuery(self, payload)

class MockQuery:
    def __init__(self, table, data, count=None):
        self.table = table
        self.data = list(data)
        self.count_mode = count

    def eq(self, field, value):
        self.data = [x for x in self.data if x.get(field) == value]
        return self

    def or_(self, filter_str):
        parts = filter_str.split(",")
        queries = []
        for part in parts:
            if ".ilike." in part:
                field, val = part.split(".ilike.")
                queries.append((field.strip(), val.replace("%", "").lower()))
        
        filtered = []
        for item in self.data:
            match = False
            for field, val in queries:
                if val in str(item.get(field, "")).lower():
                    match = True
                    break
            if match:
                filtered.append(item)
        self.data = filtered
        return self

    def order(self, field, desc=True):
        self.data.sort(key=lambda x: x.get(field, ""), reverse=desc)
        return self

    def range(self, start, end):
        self.data = self.data[start:end+1]
        return self

    def execute(self):
        return MockResponse(self.data, count=len(self.data) if self.count_mode else None)

class MockUpdateQuery:
    def __init__(self, table, payload):
        self.table = table
        self.payload = payload

    def eq(self, field, value):
        updated = []
        for item in self.table.data:
            if item.get(field) == value:
                for k, v in self.payload.items():
                    # Handle increment operation
                    if k == "$inc":
                        for inc_k, inc_v in v.items():
                            item[inc_k] = item.get(inc_k, 0) + inc_v
                    else:
                        item[k] = v
                updated.append(item)
        self.table._save()
        return MockResponse(updated)

class MockResponse:
    def __init__(self, data, count=None):
        self.data = data
        self.count = count

class MockSupabaseClient:
    def table(self, name: str):
        return MockSupabaseTable(name)

supabase_client = None

async def connect_db():
    global supabase_client
    if not SUPABASE_URL or not SUPABASE_KEY:
        logger.warning("SUPABASE_URL/KEY not found. Operating in local JSON Mock DB mode.")
        supabase_client = MockSupabaseClient()
    else:
        try:
            logger.info("Initializing Supabase Client...")
            supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
            logger.info("Supabase Client connected.")
        except Exception as e:
            logger.error(f"Supabase connection failed: {str(e)}. Falling back to local Mock DB.")
            supabase_client = MockSupabaseClient()

async def close_db():
    pass

def get_db():
    return supabase_client
