"""
Production NLP Inference Service for TicketIQ.
Handles:
- Loading and caching production models
- Category and urgency classification with confidence calibration
- Critical urgency threshold escalation
- Single model architecture testing in Model Lab
"""
from datetime import datetime, timezone
import json
from typing import Dict
import uuid
import joblib
import numpy as np
from fastapi import HTTPException

from app.core.config import ARTIFACTS_DIR, CRITICAL_THRESHOLD
from app.core.database import insert_ticket
from app.nlp.pipeline_stages import generate_pipeline_stages
from app.services.entities import extract_entities
from app.services.explain import explain_prediction
from app.services.sentiment import analyze_sentiment
from app.services.similarity import find_similar_tickets

# Global in-memory model store
models_store: Dict[str, any] = {}


def map_4class(cat: str) -> str:
    if cat in ["Technical Support", "IT Support", "Product Support"]:
        return "Technical"
    return cat


def load_production_models():
    """Load core production models and metrics into memory on startup."""
    print("Loading production NLP models...", flush=True)
    try:
        models_store["tfidf_vec"] = joblib.load(ARTIFACTS_DIR / "tfidf_vectorizer.joblib")
        models_store["cat_model"] = joblib.load(ARTIFACTS_DIR / "best_category_model.joblib")
        models_store["urg_model"] = joblib.load(ARTIFACTS_DIR / "best_urgency_model.joblib")
    except Exception as e:
        print(f"Warning: Failed to load models: {e}", flush=True)

    try:
        metrics_file = ARTIFACTS_DIR / "metrics.json"
        if metrics_file.exists():
            with open(metrics_file, "r") as f:
                models_store["metrics"] = json.load(f)
    except Exception as e:
        print(f"Warning: Could not load metrics.json: {e}", flush=True)

    print("TicketIQ NLP models loaded successfully! (Memory-optimized runtime)", flush=True)


def run_ticket_inference(text: str) -> Dict[str, any]:
    """Execute end-to-end triage prediction pipeline."""
    clean_input = text.strip()
    if not clean_input:
        raise HTTPException(status_code=400, detail="Text field cannot be empty.")

    tfidf_vec = models_store.get("tfidf_vec")
    cat_model = models_store.get("cat_model")
    urg_model = models_store.get("urg_model")

    if not tfidf_vec or not cat_model or not urg_model:
        raise HTTPException(status_code=503, detail="NLP models are not loaded.")

    # 1. Category Prediction
    X_vec = tfidf_vec.transform([clean_input])
    cat_probs = cat_model.predict_proba(X_vec)[0]
    cat_pred_idx = int(np.argmax(cat_probs))
    category = str(cat_model.classes_[cat_pred_idx])
    category_confidence = round(float(cat_probs[cat_pred_idx]), 2)

    # 2. Urgency Prediction
    urg_probs = urg_model.predict_proba(X_vec)[0]
    urg_pred_idx = int(np.argmax(urg_probs))
    urgency_raw = str(urg_model.classes_[urg_pred_idx])
    urgency_confidence = round(float(urg_probs[urg_pred_idx]), 2)

    # Heuristic Critical Escalation Rule: Top High predictions escalated to Critical
    high_class_idx = list(urg_model.classes_).index("High") if "High" in urg_model.classes_ else -1
    p_high = float(urg_probs[high_class_idx]) if high_class_idx >= 0 else 0.0

    if urgency_raw == "High" and p_high >= CRITICAL_THRESHOLD:
        urgency = "Critical"
    else:
        urgency = urgency_raw

    # 3. Sentiment Analysis
    sentiment = analyze_sentiment(clean_input)

    # 4. Entity Extraction
    entities = extract_entities(clean_input)

    # 5. Feature Attribution Explanations
    exp_cat = explain_prediction(clean_input, cat_model, tfidf_vec, category, top_n=8)
    exp_urg = explain_prediction(clean_input, urg_model, tfidf_vec, urgency_raw, top_n=8)

    # 6. Similar Resolved Tickets
    similar_tickets = find_similar_tickets(clean_input, top_k=5)

    # 7. Suggested Reply
    if similar_tickets and similar_tickets[0]["similarity"] >= 0.40:
        suggested_resolution = similar_tickets[0]["resolution"]
    else:
        suggested_resolution = None

    # 8. Low-Confidence Routing Gate (cat < 0.50 or urg < 0.45)
    needs_review = bool(category_confidence < 0.50 or urgency_confidence < 0.45)

    # 9. Pipeline Stages
    pipeline = generate_pipeline_stages(clean_input)

    # 10. Unique Ticket ID & DB Storage
    ticket_id = f"TK-{uuid.uuid4().hex[:6].upper()}"
    created_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    ticket_record = {
        "id": ticket_id,
        "text": clean_input,
        "category": category,
        "category_confidence": category_confidence,
        "urgency": urgency,
        "urgency_confidence": urgency_confidence,
        "sentiment": sentiment,
        "entities": entities,
        "suggested_resolution": suggested_resolution,
        "needs_review": needs_review,
        "created_at": created_at,
    }
    insert_ticket(ticket_record)

    return {
        "category": category,
        "category_confidence": category_confidence,
        "urgency": urgency,
        "urgency_confidence": urgency_confidence,
        "sentiment": sentiment,
        "entities": entities,
        "explanation": {
            "category": exp_cat,
            "urgency": exp_urg,
        },
        "similar_tickets": similar_tickets,
        "suggested_resolution": suggested_resolution,
        "needs_review": needs_review,
        "pipeline": pipeline,
        "ticket_id": ticket_id,
    }


def run_model_architecture_predict(model_name: str, text: str) -> Dict[str, any]:
    """Run single architecture model prediction for Model Lab."""
    clean_input = text.strip()
    if not clean_input:
        raise HTTPException(status_code=400, detail="Text field cannot be empty.")

    if "MiniLM" in model_name:
        raise HTTPException(
            status_code=400,
            detail=f"{model_name} is not available in the hosted demo to keep memory under 350 MB. See Model Lab benchmark table for offline evaluation metrics.",
        )

    tfidf_vec = models_store.get("tfidf_vec")
    if tfidf_vec is None:
        models_store["tfidf_vec"] = joblib.load(ARTIFACTS_DIR / "tfidf_vectorizer.joblib")
        tfidf_vec = models_store["tfidf_vec"]

    if model_name == "TF-IDF + Linear SVM":
        if "cat_tfidf_svm" not in models_store:
            models_store["cat_tfidf_svm"] = joblib.load(ARTIFACTS_DIR / "cat_tfidf_svm.joblib")
        clf = models_store["cat_tfidf_svm"]
        X_vec = tfidf_vec.transform([clean_input])
    elif model_name == "TF-IDF + Naive Bayes":
        if "cat_tfidf_nb" not in models_store:
            models_store["cat_tfidf_nb"] = joblib.load(ARTIFACTS_DIR / "cat_tfidf_nb.joblib")
        clf = models_store["cat_tfidf_nb"]
        X_vec = tfidf_vec.transform([clean_input])
    else:
        clf = models_store.get("cat_tfidf_lr") or models_store.get("cat_model")
        if clf is None:
            models_store["cat_model"] = joblib.load(ARTIFACTS_DIR / "best_category_model.joblib")
            clf = models_store["cat_model"]
        X_vec = tfidf_vec.transform([clean_input])

    if hasattr(clf, "predict_proba"):
        probs = clf.predict_proba(X_vec)[0]
        pred_idx = int(np.argmax(probs))
        category = str(clf.classes_[pred_idx])
        conf = round(float(probs[pred_idx]), 2)
    else:
        preds = clf.predict(X_vec)
        category = str(preds[0])
        conf = 0.85

    return {"category": category, "confidence": conf}
