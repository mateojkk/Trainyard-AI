import json
import os
import uuid
from datetime import datetime


class MockResponse:
    def __init__(self, data, count=None):
        self.data = data
        self.count = count


class MockSupabaseClient:
    def table(self, name: str):
        return MockSupabaseTable(name)


class MockSupabaseTable:
    def __init__(self, name: str):
        self.name = name
        self.db_dir = self._get_db_dir()
        os.makedirs(self.db_dir, exist_ok=True)
        self.file_path = os.path.join(self.db_dir, f"{name}.json")
        self.data = self._load()

    def _get_db_dir(self):
        default_dir = os.path.join(os.path.dirname(__file__), "mock_db")
        if os.getenv("VERCEL"):
            return os.getenv("MOCK_DB_DIR", "/tmp/trainyard_mock_db")
        return os.getenv("MOCK_DB_DIR", default_dir)

    def _load(self):
        if not os.path.exists(self.file_path):
            return []
        try:
            with open(self.file_path, "r", encoding="utf-8") as db_file:
                return json.load(db_file)
        except Exception:
            return []

    def _save(self):
        with open(self.file_path, "w", encoding="utf-8") as db_file:
            json.dump(self.data, db_file, indent=2, default=str)

    def _prepare_item(self, item):
        item_copy = dict(item)
        item_copy.setdefault("id", str(uuid.uuid4()))
        item_copy.setdefault("created_at", datetime.utcnow().isoformat())
        return item_copy

    def insert(self, payload):
        items = payload if isinstance(payload, list) else [payload]
        inserted = [self._prepare_item(item) for item in items]
        self.data.extend(inserted)
        self._save()
        return MockResponse(inserted)

    def select(self, columns="*", count=None):
        return MockQuery(self.data, count=count)

    def update(self, payload):
        return MockUpdateQuery(self, payload)


class MockQuery:
    def __init__(self, data, count=None):
        self.data = list(data)
        self.count_mode = count

    def eq(self, field, value):
        self.data = [item for item in self.data if item.get(field) == value]
        return self

    def or_(self, filter_str):
        terms = self._parse_terms(filter_str)
        self.data = [
            item for item in self.data
            if any(term in str(item.get(field, "")).lower() for field, term in terms)
        ]
        return self

    def _parse_terms(self, filter_str):
        terms = []
        for part in filter_str.split(","):
            if ".ilike." in part:
                field, value = part.split(".ilike.")
                terms.append((field.strip(), value.replace("%", "").lower()))
        return terms

    def order(self, field, desc=True):
        self.data.sort(key=lambda item: item.get(field, ""), reverse=desc)
        return self

    def range(self, start, end):
        self.data = self.data[start:end + 1]
        return self

    def execute(self):
        count = len(self.data) if self.count_mode else None
        return MockResponse(self.data, count=count)


class MockUpdateQuery:
    def __init__(self, table, payload):
        self.table = table
        self.payload = payload

    def eq(self, field, value):
        updated = []
        for item in self.table.data:
            if item.get(field) == value:
                self._apply_payload(item)
                updated.append(item)
        self.table._save()
        return MockResponse(updated)

    def _apply_payload(self, item):
        for key, value in self.payload.items():
            if key == "$inc":
                for inc_key, inc_value in value.items():
                    item[inc_key] = item.get(inc_key, 0) + inc_value
            else:
                item[key] = value
