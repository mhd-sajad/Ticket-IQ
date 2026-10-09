"""
Insights and analytics route for TicketIQ.
"""
from fastapi import APIRouter
from app.services.analytics import get_insights_data

router = APIRouter(tags=["insights"])


@router.get("/api/insights")
def get_insights():
    return get_insights_data()
