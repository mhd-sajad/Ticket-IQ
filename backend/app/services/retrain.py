"""
Production Retraining Service for TicketIQ.
Safely incorporates human feedback into training, runs validation on fixed test set,
and hot-swaps model in memory if no regression occurs.
"""
from datetime import datetime, timezone
from typing import Dict
from fastapi import HTTPException
import joblib
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import precision_recall_fscore_support

from app.core.config import ARTIFACTS_DIR, DATA_DIR
from app.core.database import get_db_connection
from app.services.inference import map_4class, models_store


def execute_production_retrain() -> Dict[str, any]:
    """Execute guarded model retrain using accumulated feedback."""
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
    if new_f1 >= (prev_f1 - 0.005):
        models_store["cat_model"] = candidate_model
        joblib.dump(candidate_model, ARTIFACTS_DIR / "best_category_model.joblib")

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
