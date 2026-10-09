# TicketIQ Architecture & System Design

TicketIQ is an enterprise NLP triage and human-in-the-loop audit platform designed for classifying, analyzing, and auto-routing customer support tickets.

## System Pipeline Architecture

```mermaid
graph TD
    User([Customer / Support Agent]) -->|Submit Ticket Text| FE[Frontend: React 19 SPA / Nginx]
    FE -->|POST /api/predict| API[FastAPI Gateway: 0.0.0.0:8000]

    subgraph Backend Services & Core NLP
        API --> Limiter[SlowAPI Rate Limiter]
        Limiter --> Preproc[Preprocessing & Normalization]
        Preproc --> Vec[TF-IDF Vectorizer (L2 Sparse)]
        
        Vec --> CatModel[Best Category Model: Logistic Regression]
        Vec --> UrgModel[Best Urgency Model: Logistic Regression]
        
        Preproc --> NER[Regex & Lexical Entity Extractor]
        Preproc --> VADER[NLTK VADER Sentiment Analyzer]
        
        Vec --> SimSearch[Sparse Cosine Similarity Engine]
        SimSearch --> PastTickets[(16,622 Precomputed Ticket Embeddings)]
        
        CatModel & UrgModel --> Gate{Confidence Gate<br/>Cat < 50% or Urg < 45%}
        Gate -->|Pass| RouteAuto[Auto-Triaged & Resolution Suggested]
        Gate -->|Fail: Low Confidence| ReviewQueue[(SQLite Review Queue)]
    end

    ReviewQueue --> HITL[Human Reviewer / Agent Correction]
    HITL -->|POST /api/feedback| RetrainEngine[Active Retraining Pipeline]
    RetrainEngine -->|Validate on Fixed Test Set| LiveHotSwap[Hot-Swap In-Memory Weights]
```

## Modular Directory Structure

- **`backend/app/`**:
  - `main.py`: Application entry point, lifespan, CORS, limiter, router inclusions.
  - `core/config.py`: Centralized environment configurations and path resolution.
  - `core/database.py`: SQLite schema management, connection pooling, and startup seeding.
  - `api/routes/`: Distinct routers for `health`, `predict`, `insights`, `models`, `feedback`, `review`, and `tickets`.
  - `schemas/`: Strongly-typed Pydantic request and response models matching frontend TypeScript types.
  - `services/`: Dedicated business logic for inference, feature attribution, similarity retrieval, entity extraction, sentiment analysis, analytics, and guarded retraining.
  - `nlp/`: Reusable preprocessing, tokenization, lemmatization, and feature engineering.
- **`ml/`**:
  - `src/`: Model training, hyperparameter tuning, similarity index compilation, evaluation, and error analysis scripts.
  - `artifacts/`: Non-runtime model exploration dumps, evaluation metrics, and sentence embeddings.
  - `notebooks/`: Exploratory Data Analysis and training experiments.
- **`frontend/`**:
  - React 19 SPA built with Vite, Tailwind CSS, Recharts, and TypeScript.
  - `nginx.conf`: Production SPA fallback routing and static asset caching.
- **`data/`**:
  - `raw/`: Unprocessed raw dataset downloads.
  - `processed/`: Stratified train, val, test, and seed datasets.
- **`scripts/`**:
  - `smoke_test.py`: 20-ticket benchmark and memory assertion runner.

## Screenshots

Place application screenshots in `docs/screenshots/` for showcase documentation.
