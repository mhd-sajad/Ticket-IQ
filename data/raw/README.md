# Raw Data Directory

The raw tickets dataset (`tickets.csv`) is intentionally gitignored due to file size (~51 MB).

### How to Download
To download the raw dataset from Kaggle / source repository, ensure your environment has network access and run:

```bash
python ml/src/download_data.py
```

This will fetch and place `tickets.csv` directly into `data/raw/tickets.csv`.
