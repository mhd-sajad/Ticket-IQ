"""
Feedback route for agent corrections.
"""
from fastapi import APIRouter
from app.core.database import insert_feedback
from app.schemas import FeedbackRequest, FeedbackResponse

router = APIRouter(tags=["feedback"])


@router.post("/api/feedback", response_model=FeedbackResponse)
def submit_feedback(body: FeedbackRequest):
    insert_feedback(
        ticket_id=body.ticket_id,
        actual_category=body.actual_category,
        actual_urgency=body.actual_urgency,
        notes=body.notes,
    )
    return {"status": "ok", "message": "Feedback submitted successfully."}
