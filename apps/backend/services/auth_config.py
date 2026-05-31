import os
from urllib.parse import urlparse

DEFAULT_FRONTEND_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]


def get_frontend_origins() -> list[str]:
    raw = os.getenv("FRONTEND_ORIGINS", "").strip()
    origins = [origin.strip() for origin in raw.split(",") if origin.strip()] if raw else DEFAULT_FRONTEND_ORIGINS
    if is_production():
        for origin in origins:
            parsed = urlparse(origin)
            if parsed.scheme != "https":
                raise ValueError(f"Production frontend origin must use https: {origin}")
    return origins


def get_primary_frontend_origin() -> str:
    return get_frontend_origins()[0]


def is_production() -> bool:
    return os.getenv("APP_ENV", "development").lower() == "production"


def auth_cookie_secure() -> bool:
    raw = os.getenv("AUTH_COOKIE_SECURE", "").strip().lower()
    if raw in {"1", "true", "yes"}:
        return True
    return is_production()
