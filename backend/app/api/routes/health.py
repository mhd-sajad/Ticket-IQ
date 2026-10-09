"""
Health check route for TicketIQ.
"""
from datetime import datetime, timezone
from fastapi import APIRouter
from app.schemas import HealthResponse
from app.services.inference import models_store

router = APIRouter(tags=["health"])


@router.get("/api/health", response_model=HealthResponse)
def health_check():
    models_ready = bool(
        "tfidf_vec" in models_store and "cat_model" in models_store and "urg_model" in models_store
    )
    return {
        "status": "healthy",
        "version": "1.0.0",
        "model_loaded": models_ready,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
