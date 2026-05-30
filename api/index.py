import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
APPS_DIR = ROOT_DIR / "apps"

if str(APPS_DIR) not in sys.path:
    sys.path.insert(0, str(APPS_DIR))

from backend.main import app as backend_app  # noqa: E402


class StripApiPrefix:
    def __init__(self, wrapped_app):
        self.wrapped_app = wrapped_app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http" and scope.get("path", "").startswith("/api"):
            scope = dict(scope)
            path = scope["path"][4:] or "/"
            scope["path"] = path
            scope["root_path"] = f'{scope.get("root_path", "")}/api'
        await self.wrapped_app(scope, receive, send)


app = StripApiPrefix(backend_app)
