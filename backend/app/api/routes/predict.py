"""
Prediction route for ticket triage.
"""
from fastapi import APIRouter, Request
from app.schemas import PredictRequest, PredictionResponse
from app.services.inference import run_ticket_inference

router = APIRouter(tags=["predict"])


@router.post("/api/predict", response_model=PredictionResponse)
def predict_ticket(request: Request, body: PredictRequest):
    return run_ticket_inference(body.text)
