# TicketIQ — NLP-Powered Support Ticket Triage Dashboard

An intelligent dashboard that uses Natural Language Processing to classify, prioritize, and resolve customer support tickets. Built as a portfolio showcase demonstrating the full NLP pipeline from raw text to actionable insights.

> [!NOTE]
> **Dataset Notice:** This project is built and benchmarked on the Hugging Face [customer-support-tickets](https://huggingface.co/datasets/Tobi-Bueck/customer-support-tickets) dataset (CC BY-NC 4.0). As described on the official dataset card, the data was created by Softoft using a synthetic IT ticket generator to simulate realistic customer inquiries without exposing actual personal data or proprietary company information. Consequently, all classification metrics, confusion matrices, and error analyses characterize synthetic ticket phrasing and template-generated queues rather than real production customer data.

![React](https://img.shields.io/badge/React-19-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Vite](https://img.shields.io/badge/Vite-6-purple) ![Tailwind](https://img.shields.io/badge/Tailwind-4-cyan)

## Features

- **Triage** — Paste a ticket and get instant category prediction, urgency assessment, sentiment analysis, entity extraction, similar ticket matching, and resolution suggestions.
- **Live Stream** — Real-time simulated incoming ticket stream with play/pause, speed controls, live stats ticker, filters, and slide-over deep dive.
- **Insights** — KPI cards, topic modeling, trend charts with spike detection, keyword analysis, and category/urgency distributions.
- **Model Lab** — Compare 5 NLP models side-by-side with confusion matrices, per-class metrics, and live prediction testing.
- **Review Queue** — Manage low-confidence and corrected tickets, trigger model retraining, and track F1 improvements.
- **NLP Pipeline Visualization** — See each stage: raw → normalized → tokens → stop-words removed → lemmas, with visual markers for changes.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server (mock data)
npm run dev

# Build for production
npm run build
```

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:8000` |
| `VITE_USE_MOCK` | Use mock data instead of real API (`true`/`false`) | `true` |

Create a `.env` file in the project root (one is already provided):

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_USE_MOCK=true
```

## Project Structure

```
src/
├── components/       # Shared UI components
│   ├── Layout.tsx    # App shell (sidebar + top bar)
│   └── ui.tsx        # Primitives (Card, Badge, Spinner, etc.)
├── lib/              # Utilities and services
│   ├── api.ts        # Unified API layer (mock + real)
│   ├── utils.ts      # Helpers, color maps, formatting
│   └── ThemeContext.tsx  # Dark/light mode provider
├── mocks/            # Realistic mock data
│   ├── predict.ts    # Prediction & sample tickets
│   ├── insights.ts   # Analytics mock data
│   ├── models.ts     # Model comparison data
│   └── review.ts     # Review queue data
├── pages/            # Route pages
│   ├── TriagePage.tsx
│   ├── LiveStreamPage.tsx
│   ├── InsightsPage.tsx
│   ├── ModelLabPage.tsx
│   ├── ReviewQueuePage.tsx
│   └── AboutPage.tsx
├── types/            # TypeScript interfaces
│   └── index.ts
├── App.tsx           # Router + providers
├── main.tsx          # Entry point
└── index.css         # Tailwind + custom styles
```

## API Contract

The frontend is built against these endpoints (see `src/types/index.ts` for full type definitions):

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/predict` | Analyze a ticket (category, urgency, entities, etc.) |
| `GET` | `/api/insights` | Aggregate analytics and trends |
| `GET` | `/api/models` | Model comparison metrics |
| `POST` | `/api/models/predict` | Predict with a specific model |
| `POST` | `/api/feedback` | Submit prediction corrections |
| `GET` | `/api/review` | Get review queue items |
| `POST` | `/api/retrain` | Trigger model retraining |
| `GET` | `/api/health` | Health check |

## Deployment (Vercel)

1. **Connect your repository** to Vercel.

2. **Configure build settings:**
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`

3. **Set environment variables** in the Vercel dashboard:
   - `VITE_API_BASE_URL` → your backend URL
   - `VITE_USE_MOCK` → `false` for production (or `true` for demo)

4. **Deploy.** Vercel auto-deploys on push to `main`.

For a standalone demo (no backend), set `VITE_USE_MOCK=true` — all features work with realistic mock data.

## NLP Model Benchmarks & Evaluation

All models were evaluated on the Hugging Face customer support dataset (`Tobi-Bueck/customer-support-tickets`, CC BY-NC 4.0). Analysis shows the dataset contains repetitive syntactic templates and angle-bracket entity tags like `<name>` and `<acc_num>` (545 in train, 94 in val, 82 in test; 0 occurrences of curly `{placeholder}` syntax). We identified and removed near-duplicate tickets (cosine similarity $\ge 0.85$), filtering **961 tickets from Validation** and **986 tickets from Test**. Hyperparameters were tuned strictly on `val.csv`, and all reported test numbers are calculated from a single prediction pass over the clean deduplicated test split ($N=2,576$).

### 1. What the Numbers Honestly Say

- **Category Classification:** The 4-class accuracy is **69.37%** against a **66.38%** majority-class baseline (always predicting `Technical`). Accuracy alone barely exceeds the baseline due to heavy class imbalance (Technical accounts for 66.4% of tickets). The real evidence of model signal is **Macro F1: 0.5883 vs 0.1995 baseline**, with `Billing and Payments` reaching **F1 0.7039** and `Technical` reaching **F1 0.7919**.
- **Weak Categories & Cross-Confusion:** `Returns and Exchanges` (F1 **0.3802**, support 118) and `Customer Service` (F1 **0.4770**, support 507) remain challenging. In particular, **296 Technical tickets are misclassified as Customer Service**, and **200 Customer Service tickets are misclassified as Technical** due to overlapping phrasing.
- **Urgency Assessment:** Accuracy is **54.74%** against a **41.61%** majority baseline (`Medium`), and Macro F1 is **0.5314** against a **0.1959** baseline. Urgency provides a modest but statistically genuine signal across support tiers.

### 2. Taxonomy Design: 4-Class Consolidation vs 6-Class Raw Queues

In the original 6-class dataset taxonomy, confusion matrix analysis revealed severe human annotation ambiguity: `Technical Support`, `Product Support`, and `IT Support` shared virtually identical technical vocabulary and intents. 

Consolidating these three queues into a single **`Technical`** category is a **taxonomy decision** addressing human annotation overlap.

> [!IMPORTANT]
> **Accuracy is NOT directly comparable between 6-class and 4-class tasks**: Merging classes changes the underlying label distribution and substantially raises the majority-class baseline. Models must be evaluated relative to each task's respective baseline.

| Taxonomy | Best Model | Test Accuracy (vs Majority Baseline) | Test Macro F1 (vs Majority Baseline) |
|---|---|:---:|:---:|
| **6-Class Task** | TF-IDF + Logistic Regression ($C=5.0$) | **47.94%** (Baseline: 35.79%) | **0.4671** (Baseline: 0.0879) |
| **6-Class Task** | TF-IDF + Linear SVM ($C=1.0$) | **50.93%** (Baseline: 35.79%) | **0.4645** (Baseline: 0.0879) |
| **4-Class Adopted** | **TF-IDF + Logistic Regression ($C=10.0$)** | **69.37%** (Baseline: 66.38%) | **0.5883** (Baseline: 0.1995) |
| **4-Class Task** | TF-IDF + Linear SVM ($C=1.0$) | **74.15%** (Baseline: 66.38%) | **0.5321** (Baseline: 0.1995) |

> **Selection Rationale:** While Linear SVM achieved higher raw accuracy on the 4-class problem, it biased predictions excessively toward the majority `Technical` class at the expense of minority classes (Returns & Exchanges recall dropped to 32.2%). **TF-IDF + Logistic Regression** was selected because it maximizes **Macro F1 (0.5883 vs 0.5321)**, preserves balanced per-class recall, and outputs calibrated probabilities essential for triage confidence bars.

### 3. MiniLM-L6-v2 Sentence Embedding Regularization Tuning ($C$)

Tuning regularization parameter $C \in [1, 10, 100]$ for `MiniLM + Logistic Regression` on full-length text embeddings (Test Baselines: Category Accuracy 66.38% / Macro F1 0.1995; Urgency Accuracy 41.61% / Macro F1 0.1959):

| Task | Regularization $C$ | Val Macro F1 | Val Accuracy (vs Base) | Test Macro F1 | Test Accuracy (vs Base) |
|---|:---:|:---:|:---:|:---:|:---:|
| **Category (4-Class)** | $C=1.0$ | **0.4732** | 54.48% (Base: 66.38%) | **0.4583** | 53.84% (Base: 66.38%) |
| | $C=10.0$ | 0.4586 | 52.60% (Base: 66.38%) | 0.4377 | 51.71% (Base: 66.38%) |
| | $C=100.0$ | 0.4467 | 51.56% (Base: 66.38%) | 0.4367 | 51.59% (Base: 66.38%) |
| **Urgency (3-Class)** | $C=1.0$ | 0.4216 | 43.10% (Base: 41.61%) | 0.4345 | 44.57% (Base: 41.61%) |
| | $C=10.0$ | 0.4234 | 43.29% (Base: 41.61%) | **0.4390** | **45.11%** (Base: 41.61%) |
| | $C=100.0$ | **0.4237** | 43.29% (Base: 41.61%) | 0.4357 | 44.76% (Base: 41.61%) |

### 4. Urgency Classification & Critical Escalation Heuristic

For urgency triage, **TF-IDF + Logistic Regression** ($C=5.0$) decisively outperformed SVM (0.5222 vs 0.4787 Val F1) while providing native calibrated probabilities:

| Model | Val Macro F1 | Test Accuracy (vs Base) | Test Macro F1 (vs Base) |
|---|:---:|:---:|:---:|
| **Majority Baseline** | 0.1956 | 41.61% (Base: 41.61%) | 0.1959 (Base: 0.1959) |
| **TF-IDF + Naive Bayes** | 0.3817 | 50.31% (Base: 41.61%) | 0.3886 (Base: 0.1959) |
| **MiniLM + Linear SVM** | 0.3661 | 48.84% (Base: 41.61%) | 0.3735 (Base: 0.1959) |
| **MiniLM + Logistic Regression** | 0.4234 | 45.11% (Base: 41.61%) | 0.4390 (Base: 0.1959) |
| **TF-IDF + Linear SVM** ($C=0.5$) | 0.4787 | 55.55% (Base: 41.61%) | 0.5040 (Base: 0.1959) |
| **TF-IDF + Logistic Regression** ($C=5.0$) | **0.5222** | **54.74%** (Base: 41.61%) | **0.5314** (Base: 0.1959) |

> **Critical Escalation Rule:** Dataset urgency labels include `Low`, `Medium`, and `High`. To flag critical outages without training an artificial 4th class on sparse data, high-probability High predictions ($P(\text{High}) \ge 0.8924$, calibrated to the top 7.5% of validation High predictions) are escalated to **`Critical`**.

### 5. Data Leakage Assessment: Deduplicated vs Original Test Set

To demonstrate the risk of boilerplate template leakage in customer support benchmarks:

| Task / Metric | Clean Deduplicated Test ($N=2,576$) | Original Leaked Test ($N=3,562$) | Artificial Leakage Inflation |
|---|:---:|:---:|:---:|
| **Category Accuracy** | 69.37% | 73.58% | **+4.21%** |
| **Category Macro F1** | 0.5883 | 0.6645 | **+0.0762 (+7.62 pts)** |
| **Urgency Accuracy** | 54.74% | 60.02% | **+5.28%** |
| **Urgency Macro F1** | 0.5314 | 0.5908 | **+0.0594 (+5.94 pts)** |

### 6. Human-in-the-Loop Confidence Routing (Test Set Evaluation)

To prevent erroneous automated actions in production, tickets with low confidence (`category_confidence < 0.50` or `urgency_confidence < 0.45`, calibrated on validation data) are flagged with `needs_review: true` and routed to human agents via the Review Queue:

| Cohort | Count (% of Test Set) | Category Accuracy | Category Macro F1 | Urgency Accuracy | Urgency Macro F1 |
|---|:---:|:---:|:---:|:---:|:---:|
| **Unflagged (Automated Pipeline)** | **2,004 (77.8%)** | **73.85%** | **0.6297** | **57.44%** | **0.5557** |
| **Flagged (Review Queue Routing)** | **572 (22.2%)** | 53.67% | 0.4756 | 45.28% | 0.4416 |
| **All Test Tickets ($N=2,576$)** | 2,576 (100.0%) | 69.37% | 0.5883 | 54.74% | 0.5314 |

> **Operational Impact:** Gating low-confidence tickets automates 77.8% of tickets with higher accuracy (+4.48% Category, +2.70% Urgency) while effectively isolating high-error edge cases for human review.

### 7. Known Limitations

1. **VADER Sentiment Polarity on Support Vocabulary:** Rule-based lexicon models like NLTK VADER frequently misclassify customer support grievances. In the billing dispute *"My payment was double charged for order ORD-9921. Please refund immediately!"*, inspecting VADER's lexicon reveals that only two tokens have non-zero valence: `'charged'` with valence $-0.8$ and the courtesy word `'please'` with valence $+1.3$. High-urgency grievance terms like `'refund'`, `'immediately'`, `'double'`, and `'payment'` are completely absent from the lexicon (valence $0.0$). Because the $+1.3$ score of `'please'` outweighs the $-0.8$ score of `'charged'`, VADER produces a net **positive** compound score of $+0.2003$ (`pos: 0.194`, `neg: 0.134`, `neu: 0.672`), misreading an urgent financial dispute as a positive interaction.
2. **Dataset Label Inconsistencies (Audited from `error_analysis.json` & `test.csv`):**

   - **`TCK-27513`**:
     - **Dataset Ground Truth:** `Billing and Payments` (raw queue: `Billing and Payments`)
     - **Model Predicted Category:** `Customer Service` (Confidence: 0.92)
     - **Full Ticket Text:** "Support for Data Encryption Methods Hello, I am writing to seek clarification on the encryption techniques utilized for medical records within the Wave and Microsoft Dynamics 365 systems. Could you elaborate on the security protocols in place to ensure the privacy and confidentiality of sensitive medical information? Any additional materials or support you can provide would be greatly appreciated. Thank you for your attention and help."
     - **Top Contributing Features:** `wave` (+0.3971), `support you` (+0.3027), `systems could` (+0.2391), `or support` (+0.2263)

   - **`TCK-29058`**:
     - **Dataset Ground Truth:** `Billing and Payments` (raw queue: `Billing and Payments`)
     - **Model Predicted Category:** `Technical` (Confidence: 0.44)
     - **Full Ticket Text:** "Support Request for Analytics Tools Integration with QuickBooks I hope this message finds you well. I am seeking information on analytics tools that can be integrated with QuickBooks for the purpose of investment optimization. My goal is to enhance my financial management and make informed decisions based on data. Could you kindly provide a list of compatible tools along with their features? Additionally, I would greatly appreciate any advice on how to select the most suitable tool for my business. Furthermore, I am interested in knowing the specific system requirements and the setup procedures involved. Thank you for your assistance and I look forward to your response."
     - **Top Contributing Features:** `purpose` (+0.1578), `requirements` (+0.1570), `compatible tools` (+0.1462), `furthermore am` (+0.1431)

3. **Synthetic Dataset Origin:** The official dataset card on Hugging Face (`Tobi-Bueck/customer-support-tickets`) explicitly states:
   > *"## 🔧 Synthetic IT Ticket Generator — Custom Dataset. Create a dataset tailored to your own queues & priorities (no PII). 👉 Generate custom data ... Created By Softoft (https://softoft.de)"*
   The data was synthetically generated to simulate support tickets without exposing real customer PII, resulting in repetitive syntactic phrasing and `<name>`, `<acc_num>`, `<order_id>` anonymization tokens.
4. **Weak Classes:** `Returns and Exchanges` (F1 0.3802, support 118) and `Customer Service` (F1 0.4770, support 507) suffer from lower support and diffuse vocabulary compared to Technical and Billing tickets.
5. **Technical vs Customer Service Confusion:** 296 Technical tickets are misclassified as Customer Service, and 200 Customer Service tickets as Technical. General support queries frequently touch on system issues, blurring lexical boundaries.
6. **Urgency as a Modest Signal:** With test accuracy of 54.74% (vs 41.61% baseline) and macro F1 of 0.5314 (vs 0.1959 baseline), urgency classification provides a genuine, helpful baseline signal but should be augmented with human-in-the-loop triage for ambiguous tickets.
7. **Short-Text Behavior:** TF-IDF feature vectors become sparse on inputs under 15 words. While specific keywords (e.g. billing disputes or error codes) classify reliably, brief generic messages have lower confidence and higher cross-confusion.
8. **Simulated Timestamps:** The underlying dataset lacks fine-grained real-time timestamps, so the live stream visualizer generates realistic arrival timestamps dynamically.
9. **Ephemeral Storage on Hugging Face Spaces:** Free-tier Hugging Face Spaces run on ephemeral containers. Review queue corrections and feedback stored in SQLite (`ticketiq.db`) reset upon container restart or wake-up from sleep.
10. **Cold Starts on Free Spaces:** Free Hugging Face Spaces sleep when idle. The first request after an idle period can take 30–60 seconds while the container boots; subsequent requests respond in under 50 ms.
11. **Dataset Licensing:** The benchmark dataset (`Tobi-Bueck/customer-support-tickets`) is released under the **CC BY-NC 4.0** license, restricting usage to non-commercial evaluation and portfolio research.
12. **Confidence Scores are Overconfident:** Calibration analysis on the deduplicated test set ($N=2,576$) reveals systematic overconfidence across both classification heads:
    - **Category Head:** In the $[0.70, 0.90)$ confidence bin ($N=815$), mean confidence is **80.36%** while actual accuracy is **72.76%** (a $+7.60\%$ overconfidence gap); in the $\ge 0.90$ bin ($N=716$), mean confidence is **96.19%** vs **91.90%** accuracy ($+4.29\%$ gap).
    - **Urgency Head:** In the $[0.70, 0.90)$ confidence bin ($N=689$), mean confidence is **78.83%** while actual accuracy is **64.73%** (a **$+14.10\%$** overconfidence gap); in the $\ge 0.90$ bin ($N=134$), mean confidence is **93.98%** vs **81.34%** accuracy ($+12.64\%$ gap). Softmax probabilities should be viewed as triage rankings rather than calibrated true error probabilities.
13. **Synthetic Template Density in Similarity Search:** In validation against the 16.6k training index using L2-normalized TF-IDF cosine similarity, **68.05% of validation tickets ($1,770 / 2,601$) possess a training neighbour with cosine similarity $\ge 0.40$ (88.42% category agreement)**, and **50.13% possess a neighbour $\ge 0.50$ (95.55% category agreement)**. Because the synthetic dataset reuses standardized sentence structures across tickets, high category agreement at moderate lexical overlap reflects template repetition. In unstructured human-written production environments, thresholds should be re-calibrated.

### 8. Nearest-Neighbor Similarity Threshold Calibration (TF-IDF Index)

To replace heavy neural embedding models while preserving retrieval precision, similarity search operates over a scipy sparse CSR matrix of L2-normalized TF-IDF vectors ($16,622 \times 12,000$). Cosine similarity is computed via sparse dot product ($\mathbf{q} \cdot \mathbf{D}^T$) in $<2\text{ ms}$, automatically skipping exact duplicate queries.

Threshold calibration on the validation split ($N=2,601$ tickets evaluated against the $16,622$-ticket training index):

#### Discrete Similarity Bins
| Cosine Similarity Bin | Ticket Count | Share of Val Tickets | Top-1 Category Agreement |
|:---:|:---:|:---:|:---:|
| `0.30 - 0.40` | 596 | 22.91% | 63.76% |
| `0.40 - 0.50` | 466 | 17.92% | 68.45% |
| `0.50 - 0.60` | 405 | 15.57% | 89.38% |
| `0.60 - 0.70` | 475 | 18.26% | 97.05% |
| `0.70 - 0.80` | 351 | 13.49% | 99.72% |
| `0.80+` | 73 | 2.81% | 100.00% |

#### Cumulative Decision Thresholds
| Threshold | Qualifying Tickets | Share of Val Tickets | Category Agreement | Status / Action |
|:---:|:---:|:---:|:---:|:---|
| $\ge 0.30$ | 2,366 | 90.96% | 82.21% | Low precision, high cross-category noise |
| **$\ge 0.40$** | **1,770** | **68.05%** | **88.42%** | **Adopted: Weak Match** (flagged with badge) |
| **$\ge 0.50$** | **1,304** | **50.13%** | **95.55%** | **Adopted: High-Confidence Match** |
| $\ge 0.60$ | 899 | 34.56% | 98.33% | High precision (34.6% coverage) |
| $\ge 0.70$ | 424 | 16.30% | 99.76% | Near-perfect agreement (16.3% coverage) |

> **Production Policy:**
> - **Match ($\ge 0.50$):** High confidence (95.55% category agreement). Displays past reply recommendation.
> - **Weak Match ($0.40 - 0.50$):** Moderate confidence (68.45% agreement). Displays past reply with a visible *"Weak match (xx%)"* warning badge.
> - **No Close Match ($< 0.40$):** Hides reply suggestions to prevent misleading answers.

---

## Backend Memory Optimization for Free Hosting (Render / 512 MB Cap)

Free tier hosting platforms (e.g. Render, Hugging Face Spaces free tier) enforce a strict **512 MB memory limit**; exceeding it triggers an immediate OOM container kill. Through staged optimization, backend runtime footprint was reduced from **517 MiB** down to **298.4 MiB** (a **42.3% reduction**), safely operating under the **350 MiB target**.

### Optimization Stages & Measured Memory

| Stage | Key Architectural Changes | Measured RAM (`docker stats`) | Status |
|:---|:---|:---:|:---:|
| **Baseline** | Full runtime: MiniLM ONNX sentence transformer, FastEmbed, full spaCy pipeline (parser + NER + tagger), pandas dataframe | **517.0 MiB** | **OOM Failure** (> 512 MB limit) |
| **Stage 1** | Replaced MiniLM runtime inference with TF-IDF sparse matrix (`scipy.sparse .npz`, $16.6\text{k} \times 12\text{k}$); removed `fastembed`/`onnxruntime` from runtime container; lazy-loaded Model Lab classical models; JSON metadata store | **420.9 MiB** | Hard cap met ($\le 450$ MiB), above 350 MiB target |
| **Stage 2** | Loaded spaCy with `disable=["parser", "ner"]` (retaining only tagger & lemmatizer); regex-only entity extraction (`ORDER_ID`, `AMOUNT`, `ERROR_CODE`, `DATE`, `EMAIL`); dropped `PRODUCT` entity catalog | **298.4 MiB** | **Target Achieved** ($\le 350$ MiB target) |

### Empirical Invariance Verification
Before adopting Stage 2, strict algorithmic invariants were asserted across validation and test splits:
1. **Lemma Identity:** 200 validation ticket texts were verified between full spaCy and parser/ner-disabled spaCy: **100% identical token lemmas**.
2. **Classification Metric Invariance:** Test-set predictions with the optimized pipeline were asserted against saved benchmarks:
   - Category Accuracy: **0.6937** (exact match)
   - Category Macro F1: **0.5883** (exact match)
   - Urgency Accuracy: **0.5474** (exact match)
   - Urgency Macro F1: **0.5314** (exact match)

### Free Hosting Operational Notes & Trade-offs
- **Cold Starts:** Free instances spin down when idle. The first API request may take 30–60 seconds while the container initializes. To handle this gracefully, the frontend includes an automatic cold start detector: if any initial request takes longer than 3 seconds, a banner (*"Waking up the server, this can take up to a minute"*) appears and continuously polls `/api/health` until the backend is fully responsive.
- **Ephemeral Storage:** Free containers have ephemeral local disk storage. SQLite records (`ticketiq.db`) reset upon container restart.
- **Model Lab Live Inference:** The 2 MiniLM embedding models are retained in the Model Lab benchmark table and confusion matrix viewer for offline architectural comparison, but live on-demand inference for MiniLM is disabled in the hosted demo to keep runtime RAM safely below 350 MB.

---

## Deployment Architecture

TicketIQ is architected for zero-cost deployment across **Render / Hugging Face Spaces** (Backend) and **Vercel** (Frontend).

### 1. Backend: Docker Container
- **Base Image:** `python:3.11-slim`
- **Security:** Non-root user `user` (UID `1000`).
- **Dynamic Port:** Reads platform port dynamically via `sh -c "uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-7860}"`.
- **Runtime Footprint:** Minimal runtime package set (`scikit-learn`, `scipy`, `spacy`, `nltk`, `fastapi`, `uvicorn`). Training-only dependencies (`fastembed`, `onnxruntime`) isolated in `requirements-train.txt`.

### 2. Frontend: Vercel Static SPA
- Built with Vite and TypeScript (`npm run build`).
- Connects to backend via `VITE_API_BASE_URL`.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS |
| Backend | FastAPI + Pydantic v2 + Uvicorn (Python 3.11) |
| NLP Classification | scikit-learn (TF-IDF + Logistic Regression, Linear SVM, Naive Bayes) |
| Similarity Search | SciPy Sparse CSR matrix cosine dot product ($16,622 \times 12,000$) |
| Text Normalization | spaCy `en_core_web_sm` (parser & NER disabled for lean memory) |
| Sentiment Analysis | NLTK VADER |
| Entity Extraction | High-speed precompiled regex (`ORDER_ID`, `AMOUNT`, `ERROR_CODE`, `DATE`, `EMAIL`) |

## License

MIT

