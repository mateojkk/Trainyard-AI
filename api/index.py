import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
APPS_DIR = ROOT_DIR / "apps"

if str(APPS_DIR) not in sys.path:
    sys.path.insert(0, str(APPS_DIR))

from backend.main import app
