"""
TicketIQ FastAPI Backend Application.
Serves full NLP inference, review queue, model comparison lab, retrain, and insights endpoints.
"""
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import json
from pathlib import Path
import sys
from typing import Dict, List, Optional
import uuid

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import precision_recall_fscore_support
from sklearn.linear_model import LogisticRegression
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from api.schemas import (
    FeedbackRequest,
    FeedbackResponse,
    HealthResponse,
    ModelPredictRequest,
    ModelPredictResponse,
    PredictRequest,
    PredictionResponse,
    RetrainRequest,
    RetrainResult,
    ReviewItemSchema,
    AddReviewItemRequest,
)
from db.database import get_db_connection, get_review_items, init_db, insert_feedback, insert_ticket
from nlp.entities import extract_entities
from nlp.explain import explain_prediction
from nlp.insights import get_insights_data
from nlp.pipeline_stages import generate_pipeline_stages
from nlp.sentiment import analyze_sentiment
from nlp.similarity import find_similar_tickets

DATA_DIR = BASE_DIR / "data" / "processed"
ARTIFACTS_DIR = BASE_DIR / "artifacts"
CRITICAL_THRESHOLD = 0.8924

# Global model store
models_store = {}

limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])


def map_4class(cat: str) -> str:
    if cat in ["Technical Support", "IT Support", "Product Support"]:
        return "Technical"
    return cat


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Initializing SQLite database...", flush=True)
    init_db()

    print("Loading production NLP models...", flush=True)
    try:
        models_store["tfidf_vec"] = joblib.load(ARTIFACTS_DIR / "tfidf_vectorizer.joblib")
        models_store["cat_model"] = joblib.load(ARTIFACTS_DIR / "best_category_model.joblib")
        models_store["urg_model"] = joblib.load(ARTIFACTS_DIR / "best_urgency_model.joblib")
    except Exception as e:
        print(f"Warning: Failed to load models: {e}", flush=True)

    try:
        with open(ARTIFACTS_DIR / "metrics.json", "r") as f:
            models_store["metrics"] = json.load(f)
    except Exception as e:
        print(f"Warning: Could not load metrics.json: {e}", flush=True)

    print("TicketIQ NLP backend initialized successfully! (Memory-optimized runtime)", flush=True)

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


@app.get("/api/health", response_model=HealthResponse)
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


@app.get("/api/tickets/sample")
def get_sample_tickets():
    return [
        {
            "id": "SMP-001",
            "text": "I placed order #ORD-29481 on Sept 15 for a MacBook Pro 16\" ($2,499.00) and it still shows 'processing' after 3 weeks. I've contacted support twice already with no resolution. Error code E-4012 appeared when I tried to track the shipment.",
            "category": "Customer Service",
            "urgency": "High",
        },
        {
            "id": "SMP-002",
            "text": "Hi, I can't log into my account since yesterday. I keep getting error ERR_AUTH_503 when I enter my password. I've tried resetting my password 3 times but the reset email never arrives.",
            "category": "Technical",
            "urgency": "High",
        },
        {
            "id": "SMP-003",
            "text": "I was charged $149.99 twice for order #ORD-38712 placed on Oct 2. My bank statement shows two identical transactions. I'd like a refund for the duplicate charge.",
            "category": "Billing and Payments",
            "urgency": "Critical",
        },
        {
            "id": "SMP-004",
            "text": "The SmartHome Hub Pro I received is defective — it keeps disconnecting from WiFi every 10–15 minutes and shows error code HW-ERR-7291. Order #ORD-44210 purchased on Aug 28 for $199.00. I want a replacement or full refund.",
            "category": "Technical",
            "urgency": "Medium",
        },
        {
            "id": "SMP-005",
            "text": "I need to return the item from order #ORD-88120. The jacket is the wrong size and I would like to exchange it for a Large or get a store credit refund.",
            "category": "Returns and Exchanges",
            "urgency": "Low",
        },
    ]


@app.post("/api/predict", response_model=PredictionResponse)
@limiter.limit("60/minute")
def predict_ticket(request: Request, body: PredictRequest):
    text = body.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text field cannot be empty.")

    tfidf_vec = models_store.get("tfidf_vec")
    cat_model = models_store.get("cat_model")
    urg_model = models_store.get("urg_model")

    if not tfidf_vec or not cat_model or not urg_model:
        raise HTTPException(status_code=503, detail="NLP models are not loaded.")

    # 1. Category Prediction
    X_vec = tfidf_vec.transform([text])
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
    sentiment = analyze_sentiment(text)

    # 4. Entity Extraction
    entities = extract_entities(text)

    # 5. Feature Attribution Explanations
    exp_cat = explain_prediction(text, cat_model, tfidf_vec, category, top_n=8)
    exp_urg = explain_prediction(text, urg_model, tfidf_vec, urgency_raw, top_n=8)

    # 6. Similar Resolved Tickets
    similar_tickets = find_similar_tickets(text, top_k=5)

    # 7. Suggested Reply (returns resolution if similarity >= 0.40; frontend differentiates >=0.50 as Match vs 0.40-0.50 as Weak match)
    if similar_tickets and similar_tickets[0]["similarity"] >= 0.40:
        suggested_resolution = similar_tickets[0]["resolution"]
    else:
        suggested_resolution = None

    # 8. Low-Confidence Routing Gate (chosen on val.csv: cat < 0.50 or urg < 0.45)
    needs_review = bool(category_confidence < 0.50 or urgency_confidence < 0.45)

    # 9. Pipeline Stages
    pipeline = generate_pipeline_stages(text)

    # 10. Unique Ticket ID & DB Storage
    ticket_id = f"TK-{uuid.uuid4().hex[:6].upper()}"
    created_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    ticket_record = {
        "id": ticket_id,
        "text": text,
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


@app.get("/api/insights")
def get_insights():
    return get_insights_data()


@app.get("/api/models")
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


@app.post("/api/models/predict", response_model=ModelPredictResponse)
def model_predict(request: Request, body: ModelPredictRequest):
    model_name = body.model
    text = body.text.strip()
    if not text:
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

    # Select live model with lazy-loading
    if model_name == "TF-IDF + Linear SVM":
        if "cat_tfidf_svm" not in models_store:
            models_store["cat_tfidf_svm"] = joblib.load(ARTIFACTS_DIR / "cat_tfidf_svm.joblib")
        clf = models_store["cat_tfidf_svm"]
        X_vec = tfidf_vec.transform([text])
    elif model_name == "TF-IDF + Naive Bayes":
        if "cat_tfidf_nb" not in models_store:
            models_store["cat_tfidf_nb"] = joblib.load(ARTIFACTS_DIR / "cat_tfidf_nb.joblib")
        clf = models_store["cat_tfidf_nb"]
        X_vec = tfidf_vec.transform([text])
    else:
        # Default TF-IDF + Logistic Regression
        clf = models_store.get("cat_tfidf_lr") or models_store.get("cat_model")
        if clf is None:
            models_store["cat_model"] = joblib.load(ARTIFACTS_DIR / "best_category_model.joblib")
            clf = models_store["cat_model"]
        X_vec = tfidf_vec.transform([text])

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


@app.post("/api/feedback", response_model=FeedbackResponse)
def submit_feedback(body: FeedbackRequest):
    insert_feedback(
        ticket_id=body.ticket_id,
        actual_category=body.actual_category,
        actual_urgency=body.actual_urgency,
        notes=body.notes,
    )
    return {"status": "ok", "message": "Feedback submitted successfully."}


@app.get("/api/review", response_model=List[ReviewItemSchema])
def get_review_queue():
    items = get_review_items()
    return items


@app.post("/api/review/add")
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


@app.post("/api/retrain", response_model=RetrainResult)
def trigger_retrain(body: Optional[RetrainRequest] = None):
    # 1. Fetch real feedback rows from SQLite
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT r.id, r.ticket_id, r.text, r.corrected_category, r.corrected_urgency
    FROM review_queue r
    WHERE r.corrected_category IS NOT NULL;
    """)
    review_rows = cursor.fetchall()

    cursor.execute("""
    SELECT f.ticket_id, t.text, f.actual_category, f.actual_urgency
    FROM feedback f
    JOIN tickets t ON f.ticket_id = t.id
    WHERE f.actual_category IS NOT NULL;
    """)
    fb_rows = cursor.fetchall()
    conn.close()

    total_feedback = []
    seen_texts = set()
    for r in review_rows:
        txt = r["text"]
        cat = r["corrected_category"]
        if txt and cat and txt not in seen_texts:
            seen_texts.add(txt)
            total_feedback.append({"text": txt, "category": cat})

    for r in fb_rows:
        txt = r["text"]
        cat = r["actual_category"]
        if txt and cat and txt not in seen_texts:
            seen_texts.add(txt)
            total_feedback.append({"text": txt, "category": cat})

    MIN_FEEDBACK_ROWS = 20
    if len(total_feedback) < MIN_FEEDBACK_ROWS:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough feedback to retrain. Found {len(total_feedback)} feedback rows, minimum required is {MIN_FEEDBACK_ROWS}."
        )

    # 2. Load fixed train and test sets
    train_df = pd.read_csv(DATA_DIR / "train.csv")
    test_df = pd.read_csv(DATA_DIR / "test.csv")

    X_train_orig = train_df["text"].fillna("").tolist()
    y_train_orig = [map_4class(c) for c in train_df["category"]]

    X_test = test_df["text"].fillna("").tolist()
    y_test = [map_4class(c) for c in test_df["category"]]

    # 3. Merge feedback rows into training set
    feedback_df = pd.DataFrame(total_feedback)
    X_train_merged = X_train_orig + feedback_df["text"].tolist()
    y_train_merged = y_train_orig + [map_4class(c) for c in feedback_df["category"]]

    # 4. Evaluate previous live model on fixed test set
    tfidf_vec = models_store["tfidf_vec"]
    X_test_vec = tfidf_vec.transform(X_test)
    live_model = models_store["cat_model"]
    prev_preds = live_model.predict(X_test_vec)
    prev_f1 = float(precision_recall_fscore_support(y_test, prev_preds, average="macro", zero_division=0)[2])

    # 5. Train candidate model
    X_train_merged_vec = tfidf_vec.transform(X_train_merged)
    candidate_model = LogisticRegression(C=10.0, class_weight="balanced", max_iter=1000, random_state=42)
    candidate_model.fit(X_train_merged_vec, y_train_merged)

    # 6. Evaluate candidate model on test set
    cand_preds = candidate_model.predict(X_test_vec)
    new_f1 = float(precision_recall_fscore_support(y_test, cand_preds, average="macro", zero_division=0)[2])
    f1_delta = round(new_f1 - prev_f1, 4)

    # 7. Hot-swap live model in memory and persist only if new macro F1 >= prev_f1 - 0.005
    model_updated = False
    if new_f1 >= (prev_f1 - 0.005):
        models_store["cat_model"] = candidate_model
        joblib.dump(candidate_model, ARTIFACTS_DIR / "best_category_model.joblib")
        model_updated = True

    # Mark rows as used_for_retraining in SQLite
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("UPDATE review_queue SET status = 'used_for_retraining' WHERE corrected_category IS NOT NULL;")
    conn.commit()
    conn.close()

    return {
        "status": "completed",
        "tickets_used": len(total_feedback),
        "f1_before": round(prev_f1, 4),
        "f1_after": round(new_f1, 4),
        "previous_f1": round(prev_f1, 4),
        "new_f1": round(new_f1, 4),
        "f1_delta": f1_delta,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "message": f"Successfully retrained model with {len(total_feedback)} real feedback rows.",
    }
