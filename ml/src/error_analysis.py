"""
Regenerate backend/artifacts/error_analysis.json strictly from test.csv.
Reads row's real ticket_id, text, and true label directly from test.csv.
Computes real contributing words via coefficient * tfidf weight.
Asserts that every example matches test.csv by re-reading test.csv.
"""
import json
from pathlib import Path
import joblib
import numpy as np
import pandas as pd

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = ROOT_DIR / "data" / "processed"
ARTIFACTS_DIR = ROOT_DIR / "ml" / "artifacts"


def map_4class(cat: str) -> str:
    if cat in ["Technical Support", "IT Support", "Product Support"]:
        return "Technical"
    return cat


from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS

CUSTOM_STOPS = {"hello", "hi", "dear", "please", "thanks", "thank", "would", "like"}
ALL_STOPS = set(ENGLISH_STOP_WORDS).union(CUSTOM_STOPS)


def is_all_stopwords(phrase: str) -> bool:
    tokens = phrase.lower().split()
    return all(tok in ALL_STOPS for tok in tokens)


def extract_top_words(text: str, predicted_label: str, tfidf_vec, clf, top_n=5):
    feature_names = np.array(tfidf_vec.get_feature_names_out())
    x_vec = tfidf_vec.transform([text])
    pred_idx = list(clf.classes_).index(predicted_label)
    coef = clf.coef_[pred_idx]

    feature_indices = x_vec.indices
    feature_vals = x_vec.data

    word_scores = []
    for idx, val in zip(feature_indices, feature_vals):
        feat_name = str(feature_names[idx])
        if is_all_stopwords(feat_name):
            continue
        weight = float(coef[idx] * val)
        if weight > 0:
            word_scores.append((feat_name, round(weight, 4)))

    word_scores.sort(key=lambda x: x[1], reverse=True)
    return [{"word": w, "weight": wt} for w, wt in word_scores[:top_n]]


def main():
    print("Regenerating error_analysis.json from test.csv...")
    test_df = pd.read_csv(DATA_DIR / "test.csv")
    tfidf = joblib.load(ARTIFACTS_DIR / "tfidf_vectorizer.joblib")
    cat_clf = joblib.load(ARTIFACTS_DIR / "best_category_model.joblib")
    urg_clf = joblib.load(ARTIFACTS_DIR / "best_urgency_model.joblib")

    X_test_tfidf = tfidf.transform(test_df["text"].fillna(""))
    cat_preds = cat_clf.predict(X_test_tfidf)
    cat_probs = cat_clf.predict_proba(X_test_tfidf)
    urg_preds = urg_clf.predict(X_test_tfidf)
    urg_probs = urg_clf.predict_proba(X_test_tfidf)

    y_cat_true = [map_4class(c) for c in test_df["category"]]
    y_urg_true = test_df["urgency"].tolist()

    # 1. Category misclassifications
    cat_mis_indices = [i for i in range(len(test_df)) if cat_preds[i] != y_cat_true[i]]
    print(f"Total category misclassifications: {len(cat_mis_indices)} / {len(test_df)}")

    # Pick 10 diverse misclassifications across true labels
    selected_cat_indices = []
    classes = list(cat_clf.classes_)
    for c in classes:
        matches = [i for i in cat_mis_indices if y_cat_true[i] == c]
        selected_cat_indices.extend(matches[:3])  # up to 3 per class
    selected_cat_indices = selected_cat_indices[:10]

    category_examples = []
    for idx in selected_cat_indices:
        row = test_df.iloc[idx]
        t_id = str(row["ticket_id"])
        full_text = str(row["text"])
        t_true = y_cat_true[idx]
        t_pred = str(cat_preds[idx])
        top_words = extract_top_words(full_text, t_pred, tfidf, cat_clf)
        conf = round(float(np.max(cat_probs[idx])), 2)

        category_examples.append({
            "test_row_index": int(idx),
            "ticket_id": t_id,
            "true_label": t_true,
            "predicted_label": t_pred,
            "confidence": conf,
            "text_snippet": (full_text[:160] + "...") if len(full_text) > 160 else full_text,
            "full_text": full_text,
            "top_contributing_words": top_words,
        })

    # 2. Urgency misclassifications
    urg_mis_indices = [i for i in range(len(test_df)) if urg_preds[i] != y_urg_true[i]]
    print(f"Total urgency misclassifications: {len(urg_mis_indices)} / {len(test_df)}")

    selected_urg_indices = []
    urg_classes = ["High", "Medium", "Low"]
    for u in urg_classes:
        matches = [i for i in urg_mis_indices if y_urg_true[i] == u]
        selected_urg_indices.extend(matches[:4])
    selected_urg_indices = selected_urg_indices[:10]

    urgency_examples = []
    for idx in selected_urg_indices:
        row = test_df.iloc[idx]
        t_id = str(row["ticket_id"])
        full_text = str(row["text"])
        t_true = y_urg_true[idx]
        t_pred = str(urg_preds[idx])
        top_words = extract_top_words(full_text, t_pred, tfidf, urg_clf)
        conf = round(float(np.max(urg_probs[idx])), 2)

        urgency_examples.append({
            "test_row_index": int(idx),
            "ticket_id": t_id,
            "true_label": t_true,
            "predicted_label": t_pred,
            "confidence": conf,
            "text_snippet": (full_text[:160] + "...") if len(full_text) > 160 else full_text,
            "full_text": full_text,
            "top_contributing_words": top_words,
        })

    error_analysis_data = {
        "category_misclassifications": category_examples,
        "urgency_misclassifications": urgency_examples,
    }

    # ─── RE-READ ASSERTION ────────────────────────────────────────────────────────
    # Independent verification: re-read test.csv from scratch and assert all fields match
    verify_df = pd.read_csv(DATA_DIR / "test.csv")
    ticket_id_map = {r["ticket_id"]: r for _, r in verify_df.iterrows()}

    for item in category_examples + urgency_examples:
        t_id = item["ticket_id"]
        assert t_id in ticket_id_map, f"Ticket ID {t_id} not found in test.csv"
        csv_row = ticket_id_map[t_id]
        assert csv_row["text"] == item["full_text"], f"Text mismatch for {t_id}"
        if item in category_examples:
            assert map_4class(csv_row["category"]) == item["true_label"], f"Category mismatch for {t_id}"
        else:
            assert csv_row["urgency"] == item["true_label"], f"Urgency mismatch for {t_id}"

    print("All assertions PASSED: Every example verified against independent re-reading of test.csv.")

    out_path = ARTIFACTS_DIR / "error_analysis.json"
    with open(out_path, "w") as f:
        json.dump(error_analysis_data, f, indent=2)
    print(f"Saved {out_path} successfully.")


if __name__ == "__main__":
    main()
