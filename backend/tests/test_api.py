"""
Comprehensive test suite for TicketIQ FastAPI backend and NLP services.
"""
from pathlib import Path
import sys
import pytest
from fastapi.testclient import TestClient

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from app.main import app
from app.services.entities import extract_entities
from app.services.sentiment import analyze_sentiment
from app.nlp.pipeline_stages import generate_pipeline_stages


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_entities_extraction():
    text = "Order #ORD-29481 for laptop ($2,499.00) failed with error ERR_AUTH_503 on Oct 1. Contact support@company.com."
    entities = extract_entities(text)
    labels = {e["label"] for e in entities}
    assert "ORDER_ID" in labels
    assert "AMOUNT" in labels
    assert "ERROR_CODE" in labels
    assert "DATE" in labels
    assert "EMAIL" in labels
    assert "PRODUCT" not in labels


def test_sentiment_analysis():
    neg = analyze_sentiment("This product is completely broken, terrible and useless!")
    assert neg["label"] == "negative"
    assert neg["score"] >= 0.5

    pos = analyze_sentiment("Thank you so much, this is amazing and solved my problem!")
    assert pos["label"] == "positive"
    assert pos["score"] >= 0.5


def test_pipeline_stages():
    text = "I placed order #ORD-12345 yesterday."
    pipeline = generate_pipeline_stages(text)
    assert "raw" in pipeline
    assert "normalized" in pipeline
    assert "tokens" in pipeline
    assert "without_stopwords" in pipeline
    assert "lemmas" in pipeline
    assert len(pipeline["tokens"]) > 0


def test_api_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["model_loaded"] is True


def test_api_predict(client):
    payload = {
        "text": "My SmartHome Hub keeps disconnecting from WiFi every 10 minutes with error HW-ERR-7291. Order #ORD-44210 purchased for $199.00. I need a replacement or refund."
    }
    res = client.post("/api/predict", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert "category" in data
    assert data["category"] in ["Technical", "Customer Service", "Billing and Payments", "Returns and Exchanges"]
    assert "urgency" in data
    assert data["urgency"] in ["Low", "Medium", "High", "Critical"]
    assert "category_confidence" in data
    assert "urgency_confidence" in data
    assert "sentiment" in data
    assert "entities" in data
    assert "explanation" in data
    assert "category" in data["explanation"]
    assert "similar_tickets" in data
    assert len(data["similar_tickets"]) > 0
    assert "pipeline" in data
    assert "ticket_id" in data


def test_api_insights(client):
    res = client.get("/api/insights")
    assert res.status_code == 200
    data = res.json()
    assert "kpis" in data
    assert "topics" in data
    assert "trends" in data
    assert "spikes" in data
    assert "keywords" in data
    assert "category_distribution" in data
    assert "urgency_distribution" in data


def test_api_models(client):
    res = client.get("/api/models")
    assert res.status_code == 200
    data = res.json()
    assert "models" in data
    assert len(data["models"]) >= 5
    assert "confusion_matrices" in data
    assert "per_class" in data


def test_api_models_predict(client):
    payload = {
        "model": "TF-IDF + Logistic Regression",
        "text": "I was double charged $149.99 for my recent order."
    }
    res = client.post("/api/models/predict", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "category" in data
    assert "confidence" in data


def test_api_models_predict_minilm_disabled(client):
    payload = {
        "model": "MiniLM + Logistic Regression",
        "text": "I was double charged $149.99 for my recent order."
    }
    res = client.post("/api/models/predict", json=payload)
    assert res.status_code == 400
    assert "not available in the hosted demo" in res.json()["detail"]


def test_api_feedback(client):
    payload = {
        "ticket_id": "TK-TEST123",
        "actual_category": "Billing and Payments",
        "actual_urgency": "High",
        "notes": "Payment gateway dispute"
    }
    res = client.post("/api/feedback", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"


def test_api_review(client):
    res = client.get("/api/review")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0


def test_api_retrain(client):
    payload = {"ticket_ids": ["RV-001", "RV-002"]}
    res = client.post("/api/retrain", json=payload)
    # Enforces minimum 20 verified feedback items requirement
    assert res.status_code == 400
    assert "Not enough feedback" in res.json()["detail"]
