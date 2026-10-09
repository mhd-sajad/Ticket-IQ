"""
Human-in-the-loop review queue and retraining routes.
"""
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter
from app.core.database import get_db_connection, get_review_items
from app.schemas import AddReviewItemRequest, RetrainRequest, RetrainResult, ReviewItemSchema
from app.services.retrain import execute_production_retrain

router = APIRouter(tags=["review"])


@router.get("/api/review", response_model=List[ReviewItemSchema])
def get_review_queue():
    return get_review_items()


@router.post("/api/review/add")
def add_review_queue_item(body: AddReviewItemRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM review_queue WHERE ticket_id = ?", (body.ticket_id,))
    row = cursor.fetchone()
    if row:
        conn.close()
        return {"status": "exists", "id": row["id"]}

    rv_id = f"RV-{body.ticket_id[-4:]}"
    created_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("""
    INSERT OR IGNORE INTO review_queue (
        id, ticket_id, text, predicted_category, predicted_urgency,
        corrected_category, corrected_urgency, status, confidence, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        rv_id, body.ticket_id, body.text, body.predicted_category, body.predicted_urgency,
        None, None, "pending", body.confidence, created_at
    ))
    conn.commit()
    conn.close()
    return {"status": "added", "id": rv_id}


@router.post("/api/retrain", response_model=RetrainResult)
def trigger_retrain(body: Optional[RetrainRequest] = None):
    return execute_production_retrain()
