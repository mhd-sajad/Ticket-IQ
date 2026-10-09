FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=7860 \
    HOME=/home/user \
    PYTHONPATH=/app

# Create non-root user (UID 1000)
RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

WORKDIR /app

# Copy dependency list and install spaCy model
COPY --chown=user:user backend/requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt \
    && python -m spacy download en_core_web_sm

# Copy NLTK data (vader_lexicon)
COPY --chown=user:user backend/nltk_data/ /home/user/nltk_data/

# Copy application code and runtime files
COPY --chown=user:user backend/app/ ./app/
COPY --chown=user:user backend/tests/ ./tests/
COPY --chown=user:user data/processed/seed_tickets.csv data/processed/train.csv data/processed/test.csv ./data/processed/

# Copy only runtime artifacts
COPY --chown=user:user backend/artifacts/best_category_model.joblib \
     backend/artifacts/best_urgency_model.joblib \
     backend/artifacts/tfidf_vectorizer.joblib \
     backend/artifacts/cat_tfidf_lr.joblib \
     backend/artifacts/cat_tfidf_svm.joblib \
     backend/artifacts/cat_tfidf_nb.joblib \
     backend/artifacts/metrics.json \
     backend/artifacts/similarity_tfidf.npz \
     backend/artifacts/similarity_meta.json \
     ./artifacts/

EXPOSE 7860

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-7860}"]
