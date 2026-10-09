"""
Prepare dataset for TicketIQ:
- Filter English tickets
- Combine subject + body -> text
- Drop exact duplicate and empty texts
- Map queue to operational categories purely by human-labeled queue name (NO keyword rules)
- Filter near-duplicate templated tickets from validation and test sets (cosine >= 0.85 against train)
- Generate simulated timestamps over the last 90 days with 2 injected topic spikes
- Perform stratified train / val / test split with fixed seed
- Save to data/processed
"""
import random
from datetime import datetime, timedelta
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split

RANDOM_SEED = 42
np.random.seed(RANDOM_SEED)
random.seed(RANDOM_SEED)

BASE_DIR = Path(__file__).resolve().parent.parent.parent
RAW_CSV = BASE_DIR / "data" / "raw" / "tickets.csv"
PROCESSED_DIR = BASE_DIR / "data" / "processed"

# Documented Queue Consolidation Policy:
# Minimum count threshold: 1,000 tickets.
# Queues with >= 1,000 instances are preserved as distinct classes.
# Rare queues (< 1,000 instances) are merged strictly by administrative domain:
# - Service Outages and Maintenance (937) -> Technical Support
# - Sales and Pre-Sales (724) -> Customer Service
# - General Inquiry (342) -> Customer Service
# - Human Resources (461) -> IT Support
QUEUE_MAPPING = {
    "Technical Support": "Technical Support",
    "Product Support": "Product Support",
    "Customer Service": "Customer Service",
    "IT Support": "IT Support",
    "Billing and Payments": "Billing and Payments",
    "Returns and Exchanges": "Returns and Exchanges",
    "Service Outages and Maintenance": "Technical Support",
    "Sales and Pre-Sales": "Customer Service",
    "General Inquiry": "Customer Service",
    "Human Resources": "IT Support",
}


def map_category(row) -> str:
    """
    Pure queue-based category assignment using human labels from the dataset.
    No keyword heuristics or synthetic text rules.
    """
    q = str(row.get("queue", "")).strip()
    return QUEUE_MAPPING.get(q, "Customer Service")


def map_urgency(priority_str: str) -> str:
    """Map priority column (low/medium/high) to normalized title-case."""
    p = str(priority_str).strip().lower()
    if p == "high":
        return "High"
    if p == "medium":
        return "Medium"
    if p == "low":
        return "Low"
    return "Medium"


def generate_simulated_dates(df: pd.DataFrame) -> pd.Series:
    """
    Generate simulated timestamps over the last 90 days.
    Inject 2 deliberate spikes for trend & spike detection:
    1. Returns and Exchanges spike around 18-24 days ago
    2. IT Support / access spike around 6-10 days ago
    """
    now = datetime(2026, 10, 8, 12, 0, 0)
    dates = []

    for _, row in df.iterrows():
        cat = row["category"]
        day_offset = random.randint(0, 89)

        if cat == "Returns and Exchanges" and random.random() < 0.45:
            day_offset = random.randint(18, 24)

        if cat == "IT Support" and random.random() < 0.40:
            day_offset = random.randint(6, 10)

        hour = random.randint(8, 20)
        minute = random.randint(0, 59)
        sec = random.randint(0, 59)
        ticket_time = now - timedelta(days=day_offset, hours=hour, minutes=minute, seconds=sec)
        dates.append(ticket_time.strftime("%Y-%m-%d %H:%M:%S"))

    return pd.Series(dates, index=df.index)


def filter_near_duplicates(train_texts: pd.Series, eval_df: pd.DataFrame, threshold: float = 0.85) -> pd.DataFrame:
    """
    Identifies and removes evaluation samples that have a TF-IDF cosine similarity >= threshold
    with any sample in the training set (templated boilerplate leakage).
    """
    vec = TfidfVectorizer(min_df=2, max_features=5000, stop_words="english")
    X_train = vec.fit_transform(train_texts)
    X_eval = vec.transform(eval_df["text"])

    keep_indices = []
    removed_count = 0
    batch_size = 500

    for i in range(0, X_eval.shape[0], batch_size):
        end = min(i + batch_size, X_eval.shape[0])
        sims = (X_eval[i:end] @ X_train.T).toarray()
        max_sims = sims.max(axis=1)
        for local_idx, max_sim in enumerate(max_sims):
            if max_sim < threshold:
                keep_indices.append(eval_df.index[i + local_idx])
            else:
                removed_count += 1

    print(f"  Checked {len(eval_df)} samples: removed {removed_count} near-duplicates (cosine >= {threshold}), kept {len(keep_indices)} unseen samples.")
    return eval_df.loc[keep_indices].copy()


def prepare_dataset():
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Reading raw data from {RAW_CSV}...")
    df = pd.read_csv(RAW_CSV)

    # 1. English tickets only
    df_en = df[df["language"].astype(str).str.lower() == "en"].copy()
    print(f"English tickets in raw dataset: {len(df_en)}")

    # 2. Text = subject + " " + body
    subject = df_en["subject"].fillna("").astype(str).str.strip()
    body = df_en["body"].fillna("").astype(str).str.strip()
    df_en["text"] = (subject + " " + body).str.strip()

    # 3. Clean duplicates and empties
    df_en = df_en.dropna(subset=["text"])
    df_en = df_en[df_en["text"].str.len() > 15]
    df_en = df_en.drop_duplicates(subset=["text"]).reset_index(drop=True)
    print(f"Cleaned unique English tickets: {len(df_en)}")

    # 4. Map category strictly by queue column
    df_en["category"] = df_en.apply(map_category, axis=1)
    df_en["urgency"] = df_en["priority"].apply(map_urgency)

    print("\n--- FINAL CATEGORY COUNTS (DERIVED FROM QUEUE ONLY) ---")
    cat_counts = df_en["category"].value_counts()
    for cat, count in cat_counts.items():
        print(f"  {cat:<25}: {count:>5} ({count/len(df_en)*100:>5.2f}%)")

    print("\n--- FINAL URGENCY COUNTS ---")
    urg_counts = df_en["urgency"].value_counts()
    for urg, count in urg_counts.items():
        print(f"  {urg:<25}: {count:>5} ({count/len(df_en)*100:>5.2f}%)")

    # 5. Generate simulated timestamps
    df_en["created_at"] = generate_simulated_dates(df_en)
    df_en["ticket_id"] = [f"TCK-{i+10001}" for i in range(len(df_en))]

    cols = [
        "ticket_id", "text", "subject", "body", "answer", "type", "queue",
        "category", "priority", "urgency", "created_at"
    ]
    df_final = df_en[cols].copy()

    # 6. Stratified split (70% train, 15% val, 15% test)
    strata = df_final["category"] + "___" + df_final["urgency"]
    train_val_df, raw_test_df = train_test_split(
        df_final, test_size=0.15, random_state=RANDOM_SEED, stratify=strata
    )
    strata_tv = train_val_df["category"] + "___" + train_val_df["urgency"]
    train_df, raw_val_df = train_test_split(
        train_val_df, test_size=0.17647, random_state=RANDOM_SEED, stratify=strata_tv
    )

    print(f"\nInitial split sizes:")
    print(f"  Train: {len(train_df)}")
    print(f"  Val:   {len(raw_val_df)}")
    print(f"  Test:  {len(raw_test_df)}")

    # 7. Remove templated near-duplicates from Val and Test sets against Train
    print("\nFiltering templated near-duplicates from Validation set:")
    val_df = filter_near_duplicates(train_df["text"], raw_val_df, threshold=0.85)

    print("\nFiltering templated near-duplicates from Test set:")
    test_df = filter_near_duplicates(train_df["text"], raw_test_df, threshold=0.85)

    print(f"\nFinal clean split sizes:")
    print(f"  Train: {len(train_df)}")
    print(f"  Val:   {len(val_df)} (clean unseen)")
    print(f"  Test:  {len(test_df)} (clean unseen)")

    # Save to processed directory
    df_final.to_csv(PROCESSED_DIR / "all_clean.csv", index=False)
    train_df.to_csv(PROCESSED_DIR / "train.csv", index=False)
    val_df.to_csv(PROCESSED_DIR / "val.csv", index=False)
    test_df.to_csv(PROCESSED_DIR / "test.csv", index=False)
    print(f"\nSaved all splits to {PROCESSED_DIR}")


if __name__ == "__main__":
    prepare_dataset()
