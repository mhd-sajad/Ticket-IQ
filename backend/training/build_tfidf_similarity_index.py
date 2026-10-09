"""
Build TF-IDF sparse similarity index from train.csv (all 16,622 rows).
Saves:
- backend/artifacts/similarity_tfidf.npz (scipy sparse matrix, L2-normalized rows)
- backend/artifacts/similarity_meta.json (lightweight JSON list of dicts, no pandas/pyarrow required at runtime)
"""
from pathlib import Path
import json
import joblib
import pandas as pd
import scipy.sparse as sp
import sys

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))
from nlp.similarity import clean_answer

DATA_DIR = BASE_DIR / "data" / "processed"
ARTIFACTS_DIR = BASE_DIR / "artifacts"


def map_4class(cat: str) -> str:
    if cat in ["Technical Support", "IT Support", "Product Support", "Technical"]:
        return "Technical"
    return str(cat)


def main():
    print("Loading train.csv and tfidf_vectorizer...")
    train_df = pd.read_csv(DATA_DIR / "train.csv")
    vec = joblib.load(ARTIFACTS_DIR / "tfidf_vectorizer.joblib")

    texts = train_df["text"].fillna("").tolist()
    print(f"Transforming {len(texts)} training texts with TF-IDF...")
    X_sparse = vec.transform(texts)  # Already L2-normalized by default in scikit-learn

    # Verify L2 normalization
    # norms = sp.linalg.norm(X_sparse, axis=1)

    npz_path = ARTIFACTS_DIR / "similarity_tfidf.npz"
    sp.save_npz(npz_path, X_sparse)
    npz_size_mb = npz_path.stat().st_size / (1024 * 1024)
    print(f"Saved {npz_path} ({npz_size_mb:.2f} MB), shape={X_sparse.shape}")

    print("Building lightweight metadata JSON...")
    train_df["resolution"] = train_df["answer"].fillna("").apply(clean_answer)
    train_df["category_4class"] = train_df["category"].apply(map_4class)

    meta_list = []
    for _, row in train_df.iterrows():
        meta_list.append({
            "id": str(row["ticket_id"]),
            "text": str(row["text"]),
            "category": str(row["category_4class"]),
            "resolution": str(row["resolution"]),
        })

    json_path = ARTIFACTS_DIR / "similarity_meta.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(meta_list, f, ensure_ascii=False)

    json_size_mb = json_path.stat().st_size / (1024 * 1024)
    print(f"Saved {json_path} ({json_size_mb:.2f} MB) with {len(meta_list)} entries.")


if __name__ == "__main__":
    main()
