"""
TicketIQ FastAPI Backend Application.
Modularized architecture using routers and services.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.api.routes import (
    feedback_router,
    health_router,
    insights_router,
    models_router,
    predict_router,
    review_router,
    tickets_router,
)
from app.core.config import RATE_LIMIT_DEFAULT
from app.core.database import init_db
from app.services.inference import load_production_models, models_store

limiter = Limiter(key_func=get_remote_address, default_limits=[RATE_LIMIT_DEFAULT])


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Initializing SQLite database...", flush=True)
    init_db()

    load_production_models()

    yield

    models_store.clear()


app = FastAPI(
    title="TicketIQ NLP API",
    description="NLP-powered support ticket triage, classification, entity extraction, and analytics.",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(health_router)
app.include_router(predict_router)
app.include_router(insights_router)
app.include_router(models_router)
app.include_router(feedback_router)
app.include_router(review_router)
app.include_router(tickets_router)
