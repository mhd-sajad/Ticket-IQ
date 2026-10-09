"""
Model benchmark comparison and single architecture prediction route.
"""
import json
from fastapi import APIRouter, HTTPException, Request
from app.core.config import ARTIFACTS_DIR
from app.schemas import ModelPredictRequest, ModelPredictResponse
from app.services.inference import run_model_architecture_predict

router = APIRouter(tags=["models"])


@router.get("/api/models")
def get_models_comparison():
    metrics_path = ARTIFACTS_DIR / "metrics.json"
    if metrics_path.exists():
        with open(metrics_path, "r") as f:
            data = json.load(f)
            return {
                "models": data.get("models", []),
                "confusion_matrices": data.get("confusion_matrices", {}),
                "per_class": data.get("per_class", {}),
                "category_4class": data.get("category_4class", {}),
                "urgency_3class": data.get("urgency_3class", {}),
                "test_sample_size": data.get("test_sample_size", 2576),
            }
    raise HTTPException(status_code=500, detail="metrics.json not found.")


@router.post("/api/models/predict", response_model=ModelPredictResponse)
def model_predict(request: Request, body: ModelPredictRequest):
    return run_model_architecture_predict(body.model, body.text)
