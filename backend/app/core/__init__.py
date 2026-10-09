"""
Core module for TicketIQ.
"""
from app.core.config import (
    ARTIFACTS_DIR,
    CRITICAL_THRESHOLD,
    DATA_DIR,
    DB_PATH,
    RATE_LIMIT_DEFAULT,
    RATE_LIMIT_PREDICT,
    SEED_CSV_PATH,
)

__all__ = [
    "ARTIFACTS_DIR",
    "CRITICAL_THRESHOLD",
    "DATA_DIR",
    "DB_PATH",
    "RATE_LIMIT_DEFAULT",
    "RATE_LIMIT_PREDICT",
    "SEED_CSV_PATH",
]
