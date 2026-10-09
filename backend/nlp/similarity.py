"""
Similar tickets service using TF-IDF sparse representations and cosine similarity.
Indexes resolved support tickets from the dataset and retrieves top-k matches with suggested resolutions.
Lightweight: loads a scipy sparse matrix and JSON metadata, eliminating heavy neural embedding runtimes.
"""
from pathlib import Path
from typing import Dict, List
import json
import joblib
import numpy as np
import scipy.sparse as sp
import re

BASE_DIR = Path(__file__).resolve().parent.parent
ARTIFACTS_DIR = BASE_DIR / "artifacts"

_SPARSE_MATRIX = None
_META_LIST = None
_TFIDF_VEC = None


def clean_answer(answer: any) -> str:
    if not answer:
        return ""
    text = str(answer).replace("\\n", " ").replace("\n", " ")
    text = " ".join(text.split()).strip()

    # 1. Drop any greeting + name at start (<name>, [name], [Name], Dear <name>, etc.) and normalize to 'Hello,'
    text = re.sub(r"(?i)\bthank you[\s,]+(?:<name>|\[name\]|the customer)[\s,.]*", "Thank you. ", text)
    text = re.sub(r"(?i)^(?:(?:dear|respected|hello|hi|greetings)\s+)?(?:<name>|\[name\]|\[Name\]|the customer)[\s,:-]*", "Hello, ", text)
    text = re.sub(r"(?i)^dear\s+(?:\[[^\]]+\]|<[^>]+>)[\s,:-]*", "Hello, ", text)
    text = re.sub(r"(?i)^hello[\s,]+(?:the customer|there|<name>|\[name\]|\[Name\])[\s,:-]*", "Hello, ", text)
    text = re.sub(r"(?i)^hello,\s+is\s+assisting\s+with\b", "Hello, we are assisting with", text)
    text = re.sub(r"(?i)^hello,\s+is\s+writing\s+to\b", "Hello, we are writing to", text)
    text = re.sub(r"(?i)^hello,\s+apologizes\s+for\b", "Hello, we apologize for", text)
    text = re.sub(r"(?i)^hello,\s+has\s+written\b", "Hello, we have written", text)
    text = re.sub(r"(?i)^has\s+written\b", "We have written", text)

    # 2. If tag directly follows 'account number' or 'order number', delete just the tag
    text = re.sub(r"(?i)\b(account\s+number|account\s+no\.?|order\s+number|order\s+id)\s*[:#-]?\s*(?:<[^>]+>|\[[^\]]+\])", r"\1", text)

    # 3. Contextual tag replacements
    text = re.sub(r"(?i)(?:your\s+)?(?:<acc_num>|\[acc_num\]|<account_number>|\[account_number\])", "your account number", text)
    text = re.sub(r"(?i)(?:your\s+)?(?:<order_id>|\[order_id\]|<order_number>|\[order_number\])", "your order number", text)
    text = re.sub(r"(?i)(?:<tel_num>|\[tel_num\]|<phone>|\[phone\])", "our support line", text)
    text = re.sub(r"(?i)(?:<email>|\[email\])", "our support email", text)
    text = re.sub(r"(?i),\s*(?:<name>|\[name\]|\[Name\]|the customer)\b", "", text)

    # 4. Remove all remaining <...> and [...] placeholder tags
    text = re.sub(r"<[^>]+>|\[[^\]]+\]", "", text)

    # 5. Collapse accidental duplicate adjacent phrases / words
    for _ in range(3):
        text = re.sub(r"(?i)\b([a-z0-9]+(?:\s+[a-z0-9]+){1,3})\s+\1\b", r"\1", text)
        text = re.sub(r"(?i)\b([a-z0-9]+)\s+\1\b", r"\1", text)

    # Normalize greetings and clean punctuation
    text = re.sub(r"(?i)^(?:hello[\s,]*)+", "Hello, ", text)
    text = re.sub(r"\s+([,.:;?!])", r"\1", text)
    text = re.sub(r",([.?!])", r"\1", text)
    text = " ".join(text.split()).strip()

    # 6. Truncate at last full sentence within ~300 chars (never mid-word)
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


def get_similarity_index():
    global _SPARSE_MATRIX, _META_LIST
    if _SPARSE_MATRIX is not None and _META_LIST is not None:
        return _SPARSE_MATRIX, _META_LIST

    npz_path = ARTIFACTS_DIR / "similarity_tfidf.npz"
    json_path = ARTIFACTS_DIR / "similarity_meta.json"

    _SPARSE_MATRIX = sp.load_npz(npz_path)
    with open(json_path, "r", encoding="utf-8") as f:
        _META_LIST = json.load(f)

    return _SPARSE_MATRIX, _META_LIST


def get_tfidf_vectorizer():
    global _TFIDF_VEC
    if _TFIDF_VEC is None:
        _TFIDF_VEC = joblib.load(ARTIFACTS_DIR / "tfidf_vectorizer.joblib")
    return _TFIDF_VEC


def find_similar_tickets(query_text: str, top_k: int = 5) -> List[Dict[str, any]]:
    X_matrix, meta_list = get_similarity_index()
    vec = get_tfidf_vectorizer()

    q_vec = vec.transform([query_text])  # 1 x D sparse matrix (L2-normalized)
    sims = (X_matrix @ q_vec.T).toarray().flatten()

    sorted_indices = np.argsort(sims)[::-1]
    query_clean = " ".join(query_text.split()).strip().lower()

    results = []
    for idx in sorted_indices:
        item = meta_list[idx]
        cand_text = item["text"]
        cand_clean = " ".join(cand_text.split()).strip().lower()
        if cand_clean == query_clean:
            continue

        results.append({
            "id": str(item["id"]),
            "text": cand_text[:160].strip() + "...",
            "similarity": round(float(sims[idx]), 2),
            "category": str(item["category"]),
            "resolution": str(item["resolution"]),
        })
        if len(results) >= top_k:
            break

    return results
