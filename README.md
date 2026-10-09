# TicketIQ — NLP-Powered Support Ticket Triage Dashboard

## What this is

TicketIQ is an intelligent triage and analytics platform for customer support operations. Given an incoming raw support ticket, it runs a lean NLP pipeline to predict ticket category, assess urgency, score sentiment, extract key business entities, retrieve similar resolved historical tickets to suggest relevant answers, and identify queue-level trends.

The project demonstrates an end-to-end production machine learning workflow: exploratory data analysis, data hygiene and leakage prevention, reproducible training, taxonomy consolidation, calibration, confidence-based human-in-the-loop review routing, and low-latency REST deployment optimized for strict memory environments ($\le 350$ MiB RAM).

### Stack

- **Backend:** FastAPI, Pydantic v2, Uvicorn, Python 3.11
- **NLP / ML:** scikit-learn (TF-IDF, Logistic Regression, Linear SVM, Multinomial Naive Bayes), SciPy (sparse CSR cosine similarity), spaCy `en_core_web_sm` (tagger & lemmatizer only; parser and NER disabled), NLTK VADER sentiment analyzer, precompiled regular expressions
- **Database:** SQLite (persists review queue items, feedback, and baseline analytics)
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide icons
- **Containerization & Orchestration:** Docker multi-stage builds, Docker Compose, Nginx reverse proxy

---

## How it's organized

```
Ticket-IQ/
├── backend/
│   ├── app/
│   │   ├── api/routes/          # FastAPI route controllers
│   │   │   ├── feedback.py      # /api/feedback (human correction submissions)
│   │   │   ├── health.py        # /api/health
│   │   │   ├── insights.py      # /api/insights (keyword-rule analytics)
│   │   │   ├── models.py        # /api/models (comparison & on-demand test)
│   │   │   ├── predict.py       # /api/predict (core triage inference)
│   │   │   ├── review.py        # /api/review (review queue retrieval & retrain)
│   │   │   └── tickets.py       # /api/tickets/sample (interactive examples)
│   │   ├── core/                # Application configuration & database
│   │   │   ├── config.py        # Environment settings & artifact paths
│   │   │   └── database.py      # SQLite connection & seed loader
│   │   ├── nlp/                 # Core NLP transformations
│   │   │   ├── features.py      # Regex entity extraction
│   │   │   ├── pipeline_stages.py # Stage visualizer (raw -> norm -> tokens -> lemmas)
│   │   │   └── preprocess.py    # spaCy text normalization
│   │   ├── schemas/             # Strongly typed Pydantic models
│   │   │   └── schemas.py       # Request/response contracts
│   │   ├── services/            # Domain logic and service layer
│   │   │   ├── analytics.py     # Aggregations & keyword topic grouping
│   │   │   ├── entities.py      # Entity extraction service
│   │   │   ├── explain.py       # TF-IDF linear model feature attribution
│   │   │   ├── inference.py     # Runtime model loader & prediction
│   │   │   ├── retrain.py       # Incremental retraining pipeline
│   │   │   ├── sentiment.py     # NLTK VADER sentiment analysis
│   │   │   └── similarity.py    # Sparse TF-IDF cosine similarity search
│   │   └── main.py              # Application entrypoint & CORS middleware
│   ├── artifacts/               # Production runtime artifacts (lightweight)
│   │   ├── cat_tfidf_lr.joblib  # Category classifier
│   │   ├── urg_tfidf_lr.joblib  # Urgency classifier
│   │   ├── tfidf_vectorizer.joblib
│   │   ├── train_tfidf_matrix.npz # 16,622 x 12,000 sparse CSR index
│   │   ├── similarity_meta.json # Train ticket metadata & cleaned replies
│   │   └── metrics.json         # Evaluated test metrics & confusion matrices
│   ├── nltk_data/               # Vendored NLTK VADER lexicon
│   ├── tests/                   # Pytest suite
│   ├── Dockerfile               # Backend container definition
│   └── requirements.txt         # Runtime Python dependencies
├── data/
│   ├── raw/                     # Raw downloaded tickets (gitignored)
│   └── processed/               # Clean splits & deterministic SQLite seed
│       ├── train.csv            # 16,622 training tickets
│       ├── val.csv              # 2,601 deduplicated validation tickets
│       ├── test.csv             # 2,576 deduplicated test tickets
│       ├── test_raw_with_duplicates.csv # Leakage benchmark split
│       └── seed_tickets.csv     # Exact 3,000 tickets seeding SQLite
├── docs/                        # Architecture documentation & diagrams
│   └── architecture.md
├── frontend/
│   ├── src/                     # React 19 SPA source code
│   │   ├── components/          # Reusable UI primitives and layout
│   │   ├── lib/                 # API client & utilities
│   │   ├── pages/               # Triage, Live Stream, Insights, Model Lab, Review Queue
│   │   └── types/               # TypeScript interfaces
│   ├── Dockerfile               # Multi-stage Vite build + Nginx
│   ├── nginx.conf               # Nginx reverse proxy configuration
│   └── package.json
├── ml/
│   ├── artifacts/               # Non-runtime model artifacts & embeddings
│   ├── notebooks/               # Jupyter exploration (01_eda.ipynb)
│   ├── src/                     # Offline training & evaluation scripts
│   │   ├── download_data.py     # Dataset download & cleaning
│   │   ├── train_models.py      # Model training & serialization
│   │   ├── evaluate.py          # Full model evaluation & metrics export
│   │   ├── compare_taxonomies.py # 4-class vs 6-class comparison
│   │   ├── error_analysis.py    # Per-ticket error & feature attribution
│   │   └── evaluate_similarity_thresholds.py
│   └── requirements.txt         # Training dependencies (fastembed, etc.)
├── scripts/
│   └── smoke_test.py            # Latency and health verification script
├── docker-compose.yml           # Unified orchestration definition
└── README.md
```

### How it fits together

1. **Ingestion & Text Preprocessing:** When `/api/predict` receives ticket text, `app/nlp/preprocess.py` uses a lightweight spaCy instance (`parser` and `ner` disabled to keep memory $<350$ MiB) to tokenize and lemmatize text while stripping punctuation.
2. **Inference & Attribution:** The preprocessed text is transformed via the pre-fitted TF-IDF vectorizer and passed to Logistic Regression classifiers for Category (4 classes) and Urgency (3 classes). `app/services/explain.py` computes feature importance by taking the dot product of non-zero TF-IDF terms with model coefficients, skipping stop words.
3. **Similarity Retrieval:** `app/services/similarity.py` takes the L2-normalized TF-IDF vector and computes dot products against a pre-computed SciPy CSR sparse matrix of all 16,622 training tickets, retrieving the top nearest historical ticket in $<2$ ms without heavy neural embeddings.
4. **Sentiment & Entities:** Concurrently, NLTK VADER assigns compound polarity scores, and regex rules extract order IDs, monetary amounts, error codes, emails, and dates.
5. **Confidence Routing:** If category confidence is $<0.50$ or urgency confidence is $<0.45$, the ticket is flagged with `needs_review: true` and routed to the Review Queue for human oversight.
6. **Analytics & Topics:** `/api/insights` aggregates ticket distribution metrics. **Note:** The Insights topics are keyword-rule groups, not a trained topic model (e.g. LDA/BERTopic).

---

## How to run it

### Option 1: Docker Compose (Recommended)

Run both the FastAPI backend and React frontend with a single command:

```bash
docker compose up --build
```

- **Frontend Application:** http://localhost:5173
- **FastAPI Documentation (Swagger UI):** http://localhost:8000/docs
- **Backend Health Check:** http://localhost:8000/api/health

### Option 2: Local Python Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm

# Start the API server
PYTHONPATH=. uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Run tests:
```bash
PYTHONPATH=backend pytest backend/tests/
```

### Option 3: Local Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will run at `http://localhost:5173` and proxy requests to `http://localhost:8000`.

### Option 4: Retraining from `ml/`

To rerun the offline training and evaluation pipeline:

```bash
cd ml
pip install -r requirements.txt
python -m spacy download en_core_web_sm

# Run training (outputs to backend/artifacts/)
python src/train_models.py

# Run evaluation & generate metrics.json
python src/evaluate.py
```

---

## Results

All models were evaluated on the clean deduplicated test split ($N = 2,576$) of the Hugging Face customer support dataset (`Tobi-Bueck/customer-support-tickets`, CC BY-NC 4.0).

### Category Classification (4-Class Consolidated)

- **Overall Test Accuracy:** **69.37%** (vs **66.38%** majority-class baseline)
- **Overall Macro F1:** **0.5883** (vs **0.1995** majority-class baseline)
- **Macro Precision:** 0.5771 | **Macro Recall:** 0.6047

| Category | Precision | Recall | F1 Score | Support (Test) |
|---|:---:|:---:|:---:|:---:|
| **Technical** | 0.8278 | 0.7591 | **0.7919** | 1,710 |
| **Billing and Payments** | 0.7025 | 0.7054 | **0.7039** | 241 |
| **Customer Service** | 0.4332 | 0.5306 | **0.4770** | 507 |
| **Returns and Exchanges** | 0.3448 | 0.4237 | **0.3802** | 118 |

#### Category Confusion Matrix ($N=2,576$)

Rows denote true labels; columns denote predicted labels:

| True \ Pred | Billing & Payments | Customer Service | Returns & Exchanges | Technical | Total |
|---|:---:|:---:|:---:|:---:|:---:|
| **Billing and Payments** | **170** | 30 | 7 | 34 | 241 |
| **Customer Service** | 21 | **269** | 17 | 200 | 507 |
| **Returns and Exchanges** | 6 | 26 | **50** | 36 | 118 |
| **Technical** | 45 | 296 | 71 | **1,298** | 1,710 |

### Urgency Classification (3-Class)

- **Overall Test Accuracy:** **54.74%** (vs **41.61%** majority-class baseline)
- **Overall Macro F1:** **0.5314** (vs **0.1959** majority-class baseline)
- **Macro Precision:** 0.5285 | **Macro Recall:** 0.5380

| Urgency | Precision | Recall | F1 Score | Support (Test) |
|---|:---:|:---:|:---:|:---:|
| **High** | 0.6075 | 0.5925 | **0.5999** | 1,011 |
| **Medium** | 0.5759 | 0.5308 | **0.5524** | 1,072 |
| **Low** | 0.4020 | 0.4909 | **0.4420** | 493 |

#### Urgency Confusion Matrix ($N=2,576$)

Rows denote true labels; columns denote predicted labels:

| True \ Pred | High | Medium | Low | Total |
|---|:---:|:---:|:---:|:---:|
| **High** | **599** | 266 | 146 | 1,011 |
| **Medium** | 289 | **569** | 214 | 1,072 |
| **Low** | 98 | 153 | **242** | 493 |

### Model Lab Comparison (5 Models Evaluated on Test Set)

| Model Architecture | Features | Category Acc | Category Macro F1 | Urgency Acc | Urgency Macro F1 |
|---|---|:---:|:---:|:---:|:---:|
| **Majority Baseline** | Label Prior | 66.38% | 0.1995 | 41.61% | 0.1959 |
| **TF-IDF + Naive Bayes** | Word N-grams | 67.24% | 0.4912 | 50.31% | 0.3886 |
| **MiniLM + Linear SVM** | Dense Embeddings (384d) | 71.20% | 0.4851 | 48.84% | 0.3735 |
| **MiniLM + Logistic Regression** | Dense Embeddings (384d) | 53.84% | 0.4583 | 45.11% | 0.4390 |
| **TF-IDF + Linear SVM** | Word N-grams ($C=1.0$) | 74.15% | 0.5321 | 55.55% | 0.5040 |
| **TF-IDF + Logistic Regression** *(Adopted)* | Word N-grams ($C=10.0$ / $C=5.0$) | **69.37%** | **0.5883** | **54.74%** | **0.5314** |

> **Why TF-IDF + Logistic Regression was chosen over Linear SVM:** While Linear SVM scored higher raw category accuracy (74.15%), it heavily favored the majority `Technical` class at the expense of minority classes (Returns recall fell to 32.2%). TF-IDF + Logistic Regression achieves the highest **Macro F1 (0.5883)**, provides balanced per-class recall, and natively yields calibrated probabilities required for confidence routing.

---

## Known limitations

1. **What the Numbers Honestly Say:**
   - Category accuracy is 69.4% against a 66.4% always-Technical baseline, so raw accuracy barely beats the baseline due to heavy class imbalance. The true signal lies in macro F1 (0.59 vs 0.20 baseline), with Billing at 0.70 and Technical at 0.79.
   - **Returns and Exchanges (F1 0.38)** and **Customer Service (F1 0.48)** are weak.
   - **Cross-Confusion:** **296 Technical tickets are predicted as Customer Service**, and **200 Customer Service tickets are predicted as Technical**. General customer inquiries frequently discuss technical glitches, blurring lexical boundaries.
   - **Urgency is a modest signal:** Accuracy is 54.7% vs a 41.6% baseline, and macro F1 is 0.53 vs 0.20. It provides a helpful initial triage tier, but requires human-in-the-loop review for borderline cases.
2. **Rule-Based Insights Topics:** The topics surfaced in the Insights dashboard are grouped using deterministic keyword regex rules in `app/services/analytics.py`, not an unsupervised topic model (such as LDA or BERTopic).
3. **VADER Sentiment on Support Vocabulary:** Rule-based lexicon models like NLTK VADER misread customer support grievances. In *"My payment was double charged for order ORD-9921. Please refund immediately!"*, VADER scores `'please'` ($+1.3$) higher than `'charged'` ($-0.8$) while missing unlisted grievance words (`'refund'`, `'immediately'`, `'double'`), resulting in a falsely positive compound score of $+0.2003$.
4. **Dataset Label Inconsistencies:**
   - `TCK-27513`: Labeled as `Billing and Payments` in ground truth, but text describes encryption techniques for medical records in Wave and Microsoft Dynamics. The model predicts `Customer Service` with 0.92 confidence.
   - `TCK-29058`: Labeled as `Billing and Payments`, but text is a feature inquiry regarding analytics tool integrations for QuickBooks. The model predicts `Technical` with 0.44 confidence.
5. **Overconfidence in High Confidence Bins:** On the test set, predicted probabilities exhibit systematic overconfidence:
   - Category $[0.70, 0.90)$ bin: mean confidence is 80.36%, actual accuracy is 72.76% (+7.6% gap).
   - Urgency $[0.70, 0.90)$ bin: mean confidence is 78.83%, actual accuracy is 64.73% (+14.1% gap).
   Probabilities serve as ordinal triage ranking scores rather than exact error probabilities.
6. **Synthetic Template Repetition in Similarity Search:** In validation against the 16.6k training index, 68.05% of validation tickets share $\ge 0.40$ cosine similarity with a training ticket (88.42% category agreement). High agreement at moderate lexical overlap reflects the synthetic generator's repetitive syntactic structure. Real-world human tickets will require re-tuned thresholds.
7. **Short Text Sparsity:** Messages under 15 words yield sparse TF-IDF vectors; without distinctive domain keywords, prediction confidence drops.
8. **Simulated Live Stream:** Real-time stream timestamps are generated dynamically because the underlying dataset lacks fine-grained arrival times.

---

## Dataset notice and license

This project is built and benchmarked on the Hugging Face [customer-support-tickets](https://huggingface.co/datasets/Tobi-Bueck/customer-support-tickets) dataset.

- **Synthetic Origin:** The dataset card explicitly notes that the tickets were created by Softoft using a synthetic IT ticket generator to simulate realistic customer inquiries without exposing actual personal data or proprietary company information.
- **License:** Released under the **Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)** license. Intended for non-commercial research, academic, and portfolio demonstration purposes only.
- **Code License:** MIT License.
