"""
Configuration settings and paths for TicketIQ.
"""
from pathlib import Path

# Path resolution:
# In repo: backend/app/core/config.py -> APP_DIR = backend/app, ROOT_DIR = repo root
APP_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = APP_DIR.parent
ROOT_DIR = BACKEND_DIR if (BACKEND_DIR / "data").exists() else BACKEND_DIR.parent

# Artifacts directory (runtime models & vectorizer)
if (BACKEND_DIR / "artifacts").exists():
    ARTIFACTS_DIR = BACKEND_DIR / "artifacts"
elif (ROOT_DIR / "backend" / "artifacts").exists():
    ARTIFACTS_DIR = ROOT_DIR / "backend" / "artifacts"
else:
    ARTIFACTS_DIR = Path("/app/artifacts")

# Processed data directory
if (ROOT_DIR / "data" / "processed").exists():
    DATA_DIR = ROOT_DIR / "data" / "processed"
elif (BACKEND_DIR / "data" / "processed").exists():
    DATA_DIR = BACKEND_DIR / "data" / "processed"
else:
    DATA_DIR = Path("/app/data/processed")

# SQLite Database path
if (ROOT_DIR / "data").exists():
    DB_PATH = ROOT_DIR / "data" / "ticketiq.db"
elif (BACKEND_DIR / "data").exists():
    DB_PATH = BACKEND_DIR / "data" / "ticketiq.db"
else:
    DB_PATH = Path("/app/data/ticketiq.db")

SEED_CSV_PATH = DATA_DIR / "seed_tickets.csv"
CRITICAL_THRESHOLD = 0.8924
RATE_LIMIT_DEFAULT = "120/minute"
RATE_LIMIT_PREDICT = "60/minute"
