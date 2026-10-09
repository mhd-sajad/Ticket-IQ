FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=7860 \
    HOME=/home/user

# Create non-root user (Hugging Face Spaces default UID 1000)
RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

WORKDIR /app

# Copy dependency list and install spaCy model at build time
COPY --chown=user:user requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt \
    && python -m spacy download en_core_web_sm

# Copy NLTK data (vader_lexicon)
COPY --chown=user:user nltk_data/ /home/user/nltk_data/

# Copy application code and runtime files
COPY --chown=user:user api/ ./api/
COPY --chown=user:user nlp/ ./nlp/
COPY --chown=user:user db/ ./db/
COPY --chown=user:user tests/ ./tests/
COPY --chown=user:user data/processed/ ./data/processed/

# Copy only runtime artifacts
COPY --chown=user:user artifacts/best_category_model.joblib \
     artifacts/best_urgency_model.joblib \
     artifacts/tfidf_vectorizer.joblib \
     artifacts/cat_tfidf_lr.joblib \
     artifacts/cat_tfidf_svm.joblib \
     artifacts/cat_tfidf_nb.joblib \
     artifacts/cat_minilm_lr.joblib \
     artifacts/cat_minilm_svm.joblib \
     artifacts/metrics.json \
     artifacts/error_analysis.json \
     artifacts/similarity_tfidf.npz \
     artifacts/similarity_meta.json \
     ./artifacts/

EXPOSE 7860

CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-7860}"]
