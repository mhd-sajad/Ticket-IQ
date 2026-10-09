"""
API Routes package for TicketIQ.
"""
from app.api.routes.feedback import router as feedback_router
from app.api.routes.health import router as health_router
from app.api.routes.insights import router as insights_router
from app.api.routes.models import router as models_router
from app.api.routes.predict import router as predict_router
from app.api.routes.review import router as review_router
from app.api.routes.tickets import router as tickets_router

__all__ = [
    "feedback_router",
    "health_router",
    "insights_router",
    "models_router",
    "predict_router",
    "review_router",
    "tickets_router",
]
