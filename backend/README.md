---
title: TicketIQ API
emoji: 🎫
sdk: docker
app_port: 7860
---

# TicketIQ Backend API

Production-ready NLP API for customer support ticket triage, powered by FastAPI, scikit-learn, FastEmbed, and spaCy.

## Endpoints

- `POST /api/predict` — Predicts ticket category, urgency, sentiment, entities, feature explanations, and suggested resolutions.
- `GET /api/models` — Returns performance metrics, confusion matrices, and baselines across all benchmarked models.
- `POST /api/models/predict` — Runs predictions using a specific model architecture.
- `GET /api/insights` — Aggregate triage KPIs, topics, volume trends, and queue distributions.
- `GET /api/review` — Triage review queue for human-in-the-loop validation.
- `POST /api/feedback` — Submit human corrections for misclassified tickets.
- `POST /api/retrain` — Retrain production models with verified feedback data (minimum 20 rows, F1 degradation guard).
- `GET /api/health` — Service health check.

## Architecture & Deployment

- **Runtime:** Python 3.11-slim container running under non-root UID 1000.
- **Port:** 7860 (Hugging Face Spaces default).
- **Cold Start:** Pre-cached spaCy `en_core_web_sm` and FastEmbed `all-MiniLM-L6-v2` ONNX models for sub-3-second startup.
- **Storage:** Ephemeral SQLite on free-tier Spaces; connect external PostgreSQL or persistent volume for long-term review queue retention.
