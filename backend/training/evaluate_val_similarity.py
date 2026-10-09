"""
Evaluate similarity matching against the newly built train-only index on val.csv.
Computes:
1. Bins: 0.3-0.4, 0.4-0.5, 0.5-0.6, 0.6-0.7, 0.7-0.8, 0.8+
2. Cumulative thresholds: >=0.5, >=0.6, >=0.65, >=0.7, >=0.75, >=0.8
For each: count, share of val tickets, and category agreement.
Also verifies that matching skips any candidate whose text is identical to the query.
"""
from pathlib import Path
import numpy as np
import pandas as pd
from fastembed import TextEmbedding

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data" / "processed"
ARTIFACTS_DIR = BASE_DIR / "artifacts"


def map_4class(cat: str) -> str:
    if cat in ["Technical Support", "IT Support", "Product Support", "Technical"]:
        return "Technical"
    return str(cat)


def evaluate_similarity():
    index_path = ARTIFACTS_DIR / "similarity_index.npz"
    meta_path = ARTIFACTS_DIR / "similarity_meta.parquet"

    print("Loading train similarity index...")
    embs_train = np.load(index_path)["embeddings"].astype(np.float32)
    meta_df = pd.read_parquet(meta_path)
    train_texts_clean = [(" ".join(str(t).split()).strip().lower()) for t in meta_df["text"]]

    print(f"Loaded {len(meta_df)} training items. Embedding shape: {embs_train.shape}")

    val_df = pd.read_csv(DATA_DIR / "val.csv")
    val_texts = val_df["text"].fillna("").tolist()
    val_true_cats = [map_4class(c) for c in val_df["category"]]
    N = len(val_df)
    print(f"Embedding {N} validation tickets...")

    emb_model = TextEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2", threads=4)
    val_embs = np.array(list(emb_model.embed(val_texts, batch_size=128)), dtype=np.float32)

    # Normalize val embeddings
    norms = np.linalg.norm(val_embs, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    val_embs = val_embs / norms

    # For each validation ticket, compute cosine similarities against all train tickets
    # and find the top neighbor whose text is not identical to the query text
    top_sims = []
    agreements = []

    print("Computing nearest neighbors...")
    # Batch dot product
    # val_embs: (N, D), embs_train: (M, D) -> sim_matrix: (N, M)
    # To conserve memory, compute in chunks of 500 val tickets
    chunk_size = 500
    for start_idx in range(0, N, chunk_size):
        end_idx = min(start_idx + chunk_size, N)
        v_chunk = val_embs[start_idx:end_idx]
        sim_chunk = v_chunk @ embs_train.T  # shape: (chunk_size, M)

        for i, global_i in enumerate(range(start_idx, end_idx)):
            val_clean = " ".join(val_texts[global_i].split()).strip().lower()
            val_cat = val_true_cats[global_i]

            sims_i = sim_chunk[i]
            # Sort descending
            sorted_indices = np.argsort(sims_i)[::-1]

            # Pick top candidate that is not identical text
            best_idx = None
            best_sim = -1.0
            for cand_idx in sorted_indices[:10]:
                if train_texts_clean[cand_idx] == val_clean:
                    continue  # Skip identical text
                best_idx = cand_idx
                best_sim = float(sims_i[cand_idx])
                break

            top_sims.append(best_sim)
            top_cat = meta_df.iloc[best_idx]["category"]
            agreements.append(top_cat == val_cat)

    top_sims = np.array(top_sims)
    agreements = np.array(agreements)

    # 1. Bins
    bins = [
        ("0.3 - 0.4", 0.3, 0.4),
        ("0.4 - 0.5", 0.4, 0.5),
        ("0.5 - 0.6", 0.5, 0.6),
        ("0.6 - 0.7", 0.6, 0.7),
        ("0.7 - 0.8", 0.7, 0.8),
        ("0.8+", 0.8, 2.0),
    ]

    print("\n=== SIMILARITY BINS ===")
    print(f"{'Bin':<12} | {'Count':<7} | {'Share of Val':<14} | {'Agreement Count':<16} | {'Agreement Rate':<14}")
    print("-" * 75)
    for name, low, high in bins:
        mask = (top_sims >= low) & (top_sims < high)
        cnt = int(np.sum(mask))
        share = cnt / N * 100
        agree_cnt = int(np.sum(agreements[mask]))
        rate = (agree_cnt / cnt * 100) if cnt > 0 else 0.0
        print(f"{name:<12} | {cnt:<7} | {share:6.2f}%        | {agree_cnt:<16} | {rate:6.2f}%")

    # 2. Cumulative thresholds
    thresholds = [0.5, 0.6, 0.65, 0.7, 0.75, 0.8]
    print("\n=== CUMULATIVE THRESHOLDS ===")
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
    evaluate_similarity()
