"""
Rebuild similarity index from train.csv ONLY (all 16,622 rows) with float16 embeddings.
"""
from pathlib import Path
import numpy as np
import pandas as pd
from fastembed import TextEmbedding
import re

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data" / "processed"
ARTIFACTS_DIR = BASE_DIR / "artifacts"


def clean_answer(answer: any) -> str:
    if not answer or pd.isna(answer):
        return ""
    text = " ".join(str(answer).split()).strip()

    # 1. Replace leading '<name>,' greeting with 'Hello,'
    text = re.sub(r"^(?:Dear\s+)?<name>[\s,:-]*", "Hello, ", text, flags=re.IGNORECASE)

    # 2. Neutralize other <...> anonymization tags
    text = re.sub(r",\s*<name>", "", text, flags=re.IGNORECASE)
    text = re.sub(r"<name>", "the customer", text, flags=re.IGNORECASE)
    text = re.sub(r"<acc_num>", "your account number", text, flags=re.IGNORECASE)
    text = re.sub(r"<order_id>", "your order number", text, flags=re.IGNORECASE)
    text = re.sub(r"<tel_num>", "our support line", text, flags=re.IGNORECASE)
    text = re.sub(r"<email>", "our support email", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    text = " ".join(text.split()).strip()

    # 3. Truncate at last full sentence within ~300 chars (never mid-word)
    if len(text) > 300:
        clipped = text[:300]
        match = list(re.finditer(r"[\.!\?](?:\s|$)", clipped))
        if match:
            end_pos = match[-1].start() + 1
            text = clipped[:end_pos].strip()
        else:
            match_word = list(re.finditer(r"\s\w", clipped))
            if match_word:
                text = clipped[:match_word[-1].start()].strip() + "."
            else:
                text = clipped.strip() + "."

    return text


def map_4class(cat: str) -> str:
    if cat in ["Technical Support", "IT Support", "Product Support", "Technical"]:
        return "Technical"
    return cat


def main():
    train_path = DATA_DIR / "train.csv"
    df = pd.read_csv(train_path)
    print(f"Loaded train.csv with {len(df)} rows.")

    # Clean answers and map categories
    df["resolution"] = df["answer"].fillna("").apply(clean_answer)
    df["category_4class"] = df["category"].apply(map_4class)

    meta_cols = ["ticket_id", "text", "category_4class", "resolution"]
    meta_df = df[meta_cols].rename(columns={"category_4class": "category"}).reset_index(drop=True)

    print("Embedding texts with FastEmbed (all-MiniLM-L6-v2)...")
    emb_model = TextEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2", threads=4)
    texts = meta_df["text"].fillna("").tolist()

    embs_list = list(emb_model.embed(texts, batch_size=128))
    embs = np.array(embs_list, dtype=np.float32)

    # Normalize vectors
    norms = np.linalg.norm(embs, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    embs_norm = (embs / norms).astype(np.float16)

    index_path = ARTIFACTS_DIR / "similarity_index.npz"
    meta_path = ARTIFACTS_DIR / "similarity_meta.parquet"

    np.savez_compressed(index_path, embeddings=embs_norm)
    meta_df.to_parquet(meta_path, index=False)

    index_size_mb = index_path.stat().st_size / (1024 * 1024)
    meta_size_mb = meta_path.stat().st_size / (1024 * 1024)

    print(f"Saved {index_path} ({index_size_mb:.2f} MB)")
    print(f"Saved {meta_path} ({meta_size_mb:.2f} MB)")
    print(f"Embeddings shape: {embs_norm.shape}, dtype: {embs_norm.dtype}")


if __name__ == "__main__":
    main()
