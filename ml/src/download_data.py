"""
Download raw dataset from Hugging Face: Tobi-Bueck/customer-support-tickets
Saves to data/raw/tickets.csv
Inspects and prints columns, shapes, and sample row.
"""
from pathlib import Path
from datasets import load_dataset


def download_raw_data() -> Path:
    raw_dir = Path(__file__).resolve().parent.parent.parent / "data" / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)
    raw_file = raw_dir / "tickets.csv"

    print("Loading dataset 'Tobi-Bueck/customer-support-tickets' from Hugging Face...")
    ds = load_dataset("Tobi-Bueck/customer-support-tickets")

    # Combine splits if multiple exist, else take 'train'
    if isinstance(ds, dict):
        if "train" in ds:
            df = ds["train"].to_pandas()
        else:
            split_name = list(ds.keys())[0]
            df = ds[split_name].to_pandas()
    else:
        df = ds.to_pandas()

    print(f"\n--- DATASET INSPECTION ---")
    print(f"Total rows: {len(df)}")
    print(f"Columns ({len(df.columns)}): {list(df.columns)}")
    print("\nColumn data types and non-null counts:")
    print(df.info())

    print("\nFirst row sample:")
    for col in df.columns:
        val = str(df.iloc[0][col])
        if len(val) > 120:
            val = val[:120] + "..."
        print(f"  {col}: {val}")

    print(f"\nSaving raw dataset to {raw_file}...")
    df.to_csv(raw_file, index=False)
    print(f"Successfully saved {len(df)} rows to {raw_file}")
    return raw_file


if __name__ == "__main__":
    download_raw_data()
