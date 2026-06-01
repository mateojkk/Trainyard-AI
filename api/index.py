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
        if scope["type"] == "http":
            path = scope.get("path", "")
            print(f"DEBUG: Original path={path}, root_path={scope.get('root_path')}", flush=True)
            for prefix in ["/api/index.py", "/api/index", "/api"]:
                if path.startswith(prefix):
                    path = path[len(prefix):]
                    break
            if not path.startswith("/"):
                path = "/" + path
            scope = dict(scope)
            scope["path"] = path
            print(f"DEBUG: Rewritten path={path}", flush=True)
        await self.wrapped_app(scope, receive, send)


app = StripApiPrefix(backend_app)
