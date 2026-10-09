"""
Single source of truth for TicketIQ evaluation and reporting.
Loads the saved final models, predicts once on the deduplicated test set,
and computes:
- Accuracy, Macro P/R/F1
- Per-class P/R/F1 with true supports
- Confusion matrices
- Rigorous assertions (diagonal sum, row sums, weighted recall)
- Majority-class baselines for both Category and Urgency
Writes everything to backend/artifacts/metrics.json.
"""
import json
import sys
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, confusion_matrix, precision_recall_fscore_support

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT_DIR / "backend"))

DATA_DIR = ROOT_DIR / "data" / "processed"
BACKEND_ARTIFACTS_DIR = ROOT_DIR / "backend" / "artifacts"
ML_ARTIFACTS_DIR = ROOT_DIR / "ml" / "artifacts"
ARTIFACTS_DIR = BACKEND_ARTIFACTS_DIR


def map_4class(cat: str) -> str:
    if cat in ["Technical Support", "IT Support", "Product Support"]:
        return "Technical"
    return cat


def compute_task_metrics(y_true, y_pred, labels, task_name="Task"):
    N = len(y_true)
    acc = float(accuracy_score(y_true, y_pred))
    p_macro, r_macro, f1_macro, _ = precision_recall_fscore_support(
        y_true, y_pred, average="macro", zero_division=0
    )
    p_per, r_per, f1_per, supports = precision_recall_fscore_support(
        y_true, y_pred, labels=labels, average=None, zero_division=0
    )
    cm = confusion_matrix(y_true, y_pred, labels=labels)

    # ─── ASSERTIONS ─────────────────────────────────────────────────────────────
    # 1. Confusion-matrix diagonal sum / N == accuracy
    diag_acc = float(np.trace(cm) / N)
    assert abs(diag_acc - acc) < 1e-7, f"Diagonal acc {diag_acc} != acc {acc}"

    # 2. Row sums == supports
    row_sums = cm.sum(axis=1)
    assert (row_sums == supports).all(), f"Row sums {row_sums} != supports {supports}"

    # 3. Support-weighted recall == accuracy
    weighted_recall = float(np.sum(r_per * supports) / N)
    assert abs(weighted_recall - acc) < 1e-7, f"Weighted recall {weighted_recall} != acc {acc}"
    print(f"[{task_name}] All assertions PASSED: diag_acc == acc, row_sums == supports, weighted_recall == acc.")

    # ─── MAJORITY-CLASS BASELINE ───────────────────────────────────────────────
    # Identify most frequent class in y_true
    values, counts = np.unique(y_true, return_counts=True)
    maj_idx = int(np.argmax(counts))
    maj_class = values[maj_idx]
    y_maj = [maj_class] * N

    maj_acc = float(accuracy_score(y_true, y_maj))
    maj_p, maj_r, maj_f1, _ = precision_recall_fscore_support(
        y_true, y_maj, average="macro", zero_division=0
    )

    per_class_list = []
    for i, lbl in enumerate(labels):
        per_class_list.append({
            "label": lbl,
            "precision": round(float(p_per[i]), 4),
            "recall": round(float(r_per[i]), 4),
            "f1": round(float(f1_per[i]), 4),
            "support": int(supports[i]),
        })

    return {
        "accuracy": round(acc, 4),
        "precision": round(float(p_macro), 4),
        "recall": round(float(r_macro), 4),
        "f1": round(float(f1_macro), 4),
        "per_class": per_class_list,
        "confusion_matrix": cm.tolist(),
        "labels": labels,
        "majority_baseline": {
            "majority_class": str(maj_class),
            "accuracy": round(maj_acc, 4),
            "macro_precision": round(float(maj_p), 4),
            "macro_recall": round(float(maj_r), 4),
            "macro_f1": round(float(maj_f1), 4),
        },
    }


def main():
    print("=" * 80)
    print("TicketIQ Single Source of Truth Model Verification")
    print("=" * 80)

    # 1. Load deduplicated test set
    test_df = pd.read_csv(DATA_DIR / "test.csv")
    N = len(test_df)
    print(f"Loaded test set from {DATA_DIR / 'test.csv'}: {N} rows.")

    X_test_text = test_df["text"].fillna("").tolist()
    y_test_cat = [map_4class(c) for c in test_df["category"]]
    y_test_urg = test_df["urgency"].tolist()

    cat_labels = ["Billing and Payments", "Customer Service", "Returns and Exchanges", "Technical"]
    urg_labels = ["High", "Medium", "Low"]

    # 2. Load vectorizer and production models
    tfidf = joblib.load(ARTIFACTS_DIR / "tfidf_vectorizer.joblib")
    cat_lr = joblib.load(ARTIFACTS_DIR / "best_category_model.joblib")
    urg_lr = joblib.load(ARTIFACTS_DIR / "best_urgency_model.joblib")

    # 3. Transform ONCE
    X_test_tfidf = tfidf.transform(X_test_text)

    # 4. Predict ONCE
    cat_preds = cat_lr.predict(X_test_tfidf)
    urg_preds = urg_lr.predict(X_test_tfidf)

    # 5. Compute metrics with assertions
    cat_res = compute_task_metrics(y_test_cat, cat_preds, cat_labels, task_name="Category 4-Class")
    urg_res = compute_task_metrics(y_test_urg, urg_preds, urg_labels, task_name="Urgency 3-Class")

    # 6. Evaluate comparison models for Model Lab
    comp_models = [
        ("TF-IDF + Logistic Regression", cat_lr, False),
    ]

    for name, fname, is_emb in [
        ("TF-IDF + Linear SVM", "cat_tfidf_svm.joblib", False),
        ("TF-IDF + Naive Bayes", "cat_tfidf_nb.joblib", False),
        ("MiniLM + Logistic Regression", "cat_minilm_lr.joblib", True),
        ("MiniLM + Linear SVM", "cat_minilm_svm.joblib", True),
    ]:
        p = BACKEND_ARTIFACTS_DIR / fname
        if not p.exists():
            p = ML_ARTIFACTS_DIR / fname
        if p.exists():
            clf = joblib.load(p)
            comp_models.append((name, clf, is_emb))

    test_emb_path = ML_ARTIFACTS_DIR / "test_embeddings.npy"
    if not test_emb_path.exists():
        test_emb_path = BACKEND_ARTIFACTS_DIR / "test_embeddings.npy"
    X_test_emb = np.load(test_emb_path) if test_emb_path.exists() else None

    models_summary = []
    per_class_dict = {}
    cm_dict = {}

    for name, clf, is_emb in comp_models:
        if is_emb and X_test_emb is not None:
            preds = clf.predict(X_test_emb)
        else:
            preds = clf.predict(X_test_tfidf)

        m_acc = float(accuracy_score(y_test_cat, preds))
        p_m, r_m, f1_m, _ = precision_recall_fscore_support(y_test_cat, preds, average="macro", zero_division=0)
        p_p, r_p, f1_p, sups = precision_recall_fscore_support(y_test_cat, preds, labels=cat_labels, average=None, zero_division=0)
        m_cm = confusion_matrix(y_test_cat, preds, labels=cat_labels)

        models_summary.append({
            "name": name,
            "accuracy": round(m_acc, 4),
            "precision": round(float(p_m), 4),
            "recall": round(float(r_m), 4),
            "f1": round(float(f1_m), 4),
        })

        per_class_dict[name] = [
            {
                "label": cat_labels[i],
                "precision": round(float(p_p[i]), 4),
                "recall": round(float(r_p[i]), 4),
                "f1": round(float(f1_p[i]), 4),
                "support": int(sups[i]),
            }
            for i in range(len(cat_labels))
        ]

        cm_dict[name] = {
            "labels": cat_labels,
            "matrix": m_cm.tolist(),
        }

    # Add urgency model per-class and CM
    per_class_dict["Urgency (TF-IDF + LR)"] = urg_res["per_class"]
    cm_dict["Urgency (TF-IDF + LR)"] = {
        "labels": urg_labels,
        "matrix": urg_res["confusion_matrix"],
    }

    # 7. Construct final metrics.json payload
    metrics_payload = {
        "category_4class": cat_res,
        "urgency_3class": urg_res,
        "models": models_summary,
        "per_class": per_class_dict,
        "confusion_matrices": cm_dict,
        "test_sample_size": N,
    }

    metrics_out = ARTIFACTS_DIR / "metrics.json"
    with open(metrics_out, "w") as f:
        json.dump(metrics_payload, f, indent=2)
    print(f"\nSaved single-source metrics to {metrics_out}.")

    # 8. Print formatted tables
    print("\n" + "=" * 80)
    print("FINAL EVALUATION TABLES (DEDUPLICATED TEST SET, N=2,576)")
    print("=" * 80)

    print("\n[CATEGORY 4-CLASS] Primary Model: TF-IDF + Logistic Regression (C=10.0)")
    print(f"Majority Baseline: Class='{cat_res['majority_baseline']['majority_class']}' | Accuracy: {cat_res['majority_baseline']['accuracy']*100:.2f}% | Macro F1: {cat_res['majority_baseline']['macro_f1']:.4f}")
    print(f"Model Performance: Accuracy: {cat_res['accuracy']*100:.2f}% | Macro Precision: {cat_res['precision']:.4f} | Macro Recall: {cat_res['recall']:.4f} | Macro F1: {cat_res['f1']:.4f}")
    print("\nPer-Class Breakdown:")
    print(f"{'Class':<25} | {'Precision':<10} | {'Recall':<10} | {'F1':<10} | {'Support':<8}")
    print("-" * 75)
    for row in cat_res["per_class"]:
        print(f"{row['label']:<25} | {row['precision']:<10.4f} | {row['recall']:<10.4f} | {row['f1']:<10.4f} | {row['support']:<8}")

    print("\nConfusion Matrix (Rows: True, Columns: Predicted):")
    print(f"{'':<25} " + " ".join([f"{l[:10]:>12}" for l in cat_labels]))
    for i, row in enumerate(cat_res["confusion_matrix"]):
        print(f"{cat_labels[i]:<25} " + " ".join([f"{val:>12}" for val in row]))

    print("\n" + "-" * 80)
    print("[URGENCY 3-CLASS] Primary Model: TF-IDF + Logistic Regression (C=5.0)")
    print(f"Majority Baseline: Class='{urg_res['majority_baseline']['majority_class']}' | Accuracy: {urg_res['majority_baseline']['accuracy']*100:.2f}% | Macro F1: {urg_res['majority_baseline']['macro_f1']:.4f}")
    print(f"Model Performance: Accuracy: {urg_res['accuracy']*100:.2f}% | Macro Precision: {urg_res['precision']:.4f} | Macro Recall: {urg_res['recall']:.4f} | Macro F1: {urg_res['f1']:.4f}")
    print("\nPer-Class Breakdown:")
    print(f"{'Class':<25} | {'Precision':<10} | {'Recall':<10} | {'F1':<10} | {'Support':<8}")
    print("-" * 75)
    for row in urg_res["per_class"]:
        print(f"{row['label']:<25} | {row['precision']:<10.4f} | {row['recall']:<10.4f} | {row['f1']:<10.4f} | {row['support']:<8}")

    print("\nConfusion Matrix (Rows: True, Columns: Predicted):")
    print(f"{'':<25} " + " ".join([f"{l[:10]:>12}" for l in urg_labels]))
    for i, row in enumerate(urg_res["confusion_matrix"]):
        print(f"{urg_labels[i]:<25} " + " ".join([f"{val:>12}" for val in row]))


if __name__ == "__main__":
    main()
