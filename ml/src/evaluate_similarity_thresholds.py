"""
Evaluate TF-IDF sparse similarity matching on val.csv.
Computes:
1. Bins: 0.3-0.4, 0.4-0.5, 0.5-0.6, 0.6-0.7, 0.7-0.8, 0.8+
2. Cumulative thresholds: >=0.3, >=0.4, >=0.5, >=0.6, >=0.7, >=0.8
"""
from pathlib import Path
import json
import joblib
import numpy as np
import pandas as pd
import scipy.sparse as sp

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = ROOT_DIR / "data" / "processed"
ARTIFACTS_DIR = ROOT_DIR / "backend" / "artifacts"


def map_4class(cat: str) -> str:
    if cat in ["Technical Support", "IT Support", "Product Support", "Technical"]:
        return "Technical"
    return str(cat)


def main():
    print("Loading TF-IDF index and metadata...")
    X_train = sp.load_npz(ARTIFACTS_DIR / "similarity_tfidf.npz")
    with open(ARTIFACTS_DIR / "similarity_meta.json", "r", encoding="utf-8") as f:
        meta_list = json.load(f)
    train_clean_texts = [" ".join(item["text"].split()).strip().lower() for item in meta_list]

    vec = joblib.load(ARTIFACTS_DIR / "tfidf_vectorizer.joblib")
    val_df = pd.read_csv(DATA_DIR / "val.csv")
    val_texts = val_df["text"].fillna("").tolist()
    val_true_cats = [map_4class(c) for c in val_df["category"]]
    N = len(val_df)

    print(f"Transforming {N} validation tickets with TF-IDF...")
    X_val = vec.transform(val_texts)  # (N, D) sparse

    print("Computing cosine similarities via sparse dot product...")
    # X_val @ X_train.T -> (N, M) sparse matrix
    sim_matrix = X_val @ X_train.T  # (2601, 16622)

    top_sims = []
    agreements = []

    for i in range(N):
        row_sims = sim_matrix[i].toarray().flatten()
        val_clean = " ".join(val_texts[i].split()).strip().lower()
        val_cat = val_true_cats[i]

        sorted_indices = np.argsort(row_sims)[::-1]
        best_idx = None
        best_sim = 0.0

        for cand_idx in sorted_indices[:10]:
            if train_clean_texts[cand_idx] == val_clean:
                continue
            best_idx = cand_idx
            best_sim = float(row_sims[cand_idx])
            break

        top_sims.append(best_sim)
        top_cat = meta_list[best_idx]["category"]
        agreements.append(top_cat == val_cat)

    top_sims = np.array(top_sims)
    agreements = np.array(agreements)

    bins = [
        ("0.3 - 0.4", 0.3, 0.4),
        ("0.4 - 0.5", 0.4, 0.5),
        ("0.5 - 0.6", 0.5, 0.6),
        ("0.6 - 0.7", 0.6, 0.7),
        ("0.7 - 0.8", 0.7, 0.8),
        ("0.8+", 0.8, 2.0),
    ]

    print("\n=== TF-IDF SIMILARITY BINS ===")
    print(f"{'Bin':<12} | {'Count':<7} | {'Share of Val':<14} | {'Agreement Count':<16} | {'Agreement Rate':<14}")
    print("-" * 75)
    for name, low, high in bins:
        mask = (top_sims >= low) & (top_sims < high)
        cnt = int(np.sum(mask))
        share = cnt / N * 100
        agree_cnt = int(np.sum(agreements[mask]))
        rate = (agree_cnt / cnt * 100) if cnt > 0 else 0.0
        print(f"{name:<12} | {cnt:<7} | {share:6.2f}%        | {agree_cnt:<16} | {rate:6.2f}%")

    thresholds = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8]
    print("\n=== TF-IDF CUMULATIVE THRESHOLDS ===")
    print(f"{'Threshold':<12} | {'Count':<7} | {'Share of Val':<14} | {'Agreement Count':<16} | {'Agreement Rate':<14}")
    print("-" * 75)
    for th in thresholds:
        mask = top_sims >= th
        cnt = int(np.sum(mask))
        share = cnt / N * 100
        agree_cnt = int(np.sum(agreements[mask]))
        rate = (agree_cnt / cnt * 100) if cnt > 0 else 0.0
        print(f">={th:<10} | {cnt:<7} | {share:6.2f}%        | {agree_cnt:<16} | {rate:6.2f}%")


if __name__ == "__main__":
    main()
