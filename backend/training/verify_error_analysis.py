"""
Verification and Regeneration script for error_analysis.json.
Validates test_row_index against test.csv, checks true/predicted labels,
and recomputes coefficient * tfidf contributions.
"""
import json
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

import joblib
import numpy as np
import pandas as pd
from nlp.preprocess import normalize

DATA_DIR = BASE_DIR / "data" / "processed"
ARTIFACTS_DIR = BASE_DIR / "artifacts"


def map_4class(cat: str) -> str:
    if cat in ["Technical Support", "IT Support", "Product Support"]:
        return "Technical"
    return cat


def verify_and_regenerate():
    test_df = pd.read_csv(DATA_DIR / "test.csv")
    tfidf = joblib.load(ARTIFACTS_DIR / "tfidf_vectorizer.joblib")
    cat_model = joblib.load(ARTIFACTS_DIR / "best_category_model.joblib")
    urg_model = joblib.load(ARTIFACTS_DIR / "best_urgency_model.joblib")
    feature_names = np.array(tfidf.get_feature_names_out())

    with open(ARTIFACTS_DIR / "error_analysis.json", "r") as f:
        data = json.load(f)

    cat_examples = data.get("category_misclassifications", [])
    urg_examples = data.get("urgency_misclassifications", [])

    print(f"Loaded {len(cat_examples)} category examples and {len(urg_examples)} urgency examples.")

    cat_classes = list(cat_model.classes_)
    urg_classes = list(urg_model.classes_)

    cat_mismatches = 0
    urg_mismatches = 0

    # Verify category
    verified_cat = []
    for ex in cat_examples:
        idx = ex["test_row_index"]
        if idx >= len(test_df):
            cat_mismatches += 1
            continue
        row = test_df.iloc[idx]
        real_text = row["text"]
        real_true = map_4class(row["category"])

        # Check snippet match
        if not real_text.startswith(ex["text_snippet"][:30]):
            cat_mismatches += 1

        # Predict with live model
        X_vec = tfidf.transform([real_text])
        p_idx = int(np.argmax(cat_model.predict_proba(X_vec)[0]))
        pred_label = cat_classes[p_idx]

        if pred_label == real_true:
            # Not a misclassification under live model
            cat_mismatches += 1
            continue

        # Recompute top contributing words
        nz_idx = X_vec.indices
        nz_val = X_vec.data
        coef = cat_model.coef_[p_idx, nz_idx]
        contribs = coef * nz_val
        top_k = np.argsort(contribs)[::-1][:5]
        words = [
            {"word": str(feature_names[nz_idx[k]]), "weight": round(float(contribs[k]), 4)}
            for k in top_k if contribs[k] > 0
        ]

        verified_cat.append({
            "test_row_index": idx,
            "ticket_id": str(row["ticket_id"]),
            "true_label": real_true,
            "predicted_label": pred_label,
            "text_snippet": real_text[:160].replace("\n", " ").strip() + "...",
            "top_contributing_words": words,
        })

    # Verify urgency
    verified_urg = []
    for ex in urg_examples:
        idx = ex["test_row_index"]
        if idx >= len(test_df):
            urg_mismatches += 1
            continue
        row = test_df.iloc[idx]
        real_text = row["text"]
        real_true = str(row["urgency"])

        if not real_text.startswith(ex["text_snippet"][:30]):
            urg_mismatches += 1

        X_vec = tfidf.transform([real_text])
        p_idx = int(np.argmax(urg_model.predict_proba(X_vec)[0]))
        pred_label = urg_classes[p_idx]

        if pred_label == real_true:
            urg_mismatches += 1
            continue

        nz_idx = X_vec.indices
        nz_val = X_vec.data
        coef = urg_model.coef_[p_idx, nz_idx]
        contribs = coef * nz_val
        top_k = np.argsort(contribs)[::-1][:5]
        words = [
            {"word": str(feature_names[nz_idx[k]]), "weight": round(float(contribs[k]), 4)}
            for k in top_k if contribs[k] > 0
        ]

        verified_urg.append({
            "test_row_index": idx,
            "ticket_id": str(row["ticket_id"]),
            "true_label": real_true,
            "predicted_label": pred_label,
            "text_snippet": real_text[:160].replace("\n", " ").strip() + "...",
            "top_contributing_words": words,
        })

    print(f"Verification check: Category mismatches = {cat_mismatches}, Urgency mismatches = {urg_mismatches}")

    # If any count < 10 or mismatch detected, regenerate cleanly from test.csv
    X_test_all = tfidf.transform(test_df["text"].fillna("").tolist())
    all_cat_preds = cat_model.predict(X_test_all)
    all_urg_preds = urg_model.predict(X_test_all)

    final_cat_errors = []
    seen_cat_pairs = set()
    for i in range(len(test_df)):
        true_l = map_4class(test_df.iloc[i]["category"])
        pred_l = all_cat_preds[i]
        if true_l != pred_l:
            pair = (true_l, pred_l)
            if pair not in seen_cat_pairs or len(final_cat_errors) < 10:
                seen_cat_pairs.add(pair)
                row_vec = X_test_all[i]
                nz_idx = row_vec.indices
                nz_val = row_vec.data
                p_idx = cat_classes.index(pred_l)
                contribs = cat_model.coef_[p_idx, nz_idx] * nz_val
                top_k = np.argsort(contribs)[::-1][:5]
                words = [
                    {"word": str(feature_names[nz_idx[k]]), "weight": round(float(contribs[k]), 4)}
                    for k in top_k if contribs[k] > 0
                ]
                final_cat_errors.append({
                    "test_row_index": i,
                    "ticket_id": str(test_df.iloc[i]["ticket_id"]),
                    "true_label": true_l,
                    "predicted_label": pred_l,
                    "text_snippet": test_df.iloc[i]["text"][:160].replace("\n", " ").strip() + "...",
                    "top_contributing_words": words,
                })
                if len(final_cat_errors) == 10:
                    break

    final_urg_errors = []
    seen_urg_pairs = set()
    for i in range(len(test_df)):
        true_l = str(test_df.iloc[i]["urgency"])
        pred_l = all_urg_preds[i]
        if true_l != pred_l:
            pair = (true_l, pred_l)
            if pair not in seen_urg_pairs or len(final_urg_errors) < 10:
                seen_urg_pairs.add(pair)
                row_vec = X_test_all[i]
                nz_idx = row_vec.indices
                nz_val = row_vec.data
                p_idx = urg_classes.index(pred_l)
                contribs = urg_model.coef_[p_idx, nz_idx] * nz_val
                top_k = np.argsort(contribs)[::-1][:5]
                words = [
                    {"word": str(feature_names[nz_idx[k]]), "weight": round(float(contribs[k]), 4)}
                    for k in top_k if contribs[k] > 0
                ]
                final_urg_errors.append({
                    "test_row_index": i,
                    "ticket_id": str(test_df.iloc[i]["ticket_id"]),
                    "true_label": true_l,
                    "predicted_label": pred_l,
                    "text_snippet": test_df.iloc[i]["text"][:160].replace("\n", " ").strip() + "...",
                    "top_contributing_words": words,
                })
                if len(final_urg_errors) == 10:
                    break

    # Save 100% verified error analysis
    payload = {
        "category_misclassifications": final_cat_errors,
        "urgency_misclassifications": final_urg_errors,
    }
    with open(ARTIFACTS_DIR / "error_analysis.json", "w") as f:
        json.dump(payload, f, indent=2)

    print(f"✓ Saved 100% verified error_analysis.json ({len(final_cat_errors)} category, {len(final_urg_errors)} urgency)")

    # Print 3 urgency examples with FULL ticket text
    print("\n" + "=" * 80)
    print("3 URGENCY MISCLASSIFICATIONS WITH FULL TICKET TEXT:")
    print("=" * 80)
    for idx_ex, ex in enumerate(final_urg_errors[:3], 1):
        test_idx = ex["test_row_index"]
        full_text = test_df.iloc[test_idx]["text"]
        print(f"\n--- Example {idx_ex} (Test Row #{test_idx} | Ticket {ex['ticket_id']}) ---")
        print(f"True Urgency:      {ex['true_label']}")
        print(f"Predicted Urgency: {ex['predicted_label']}")
        print(f"Top Words:         {ex['top_contributing_words']}")
        print(f"FULL TICKET TEXT:\n{full_text}")
        print("-" * 80)


if __name__ == "__main__":
    verify_and_regenerate()
