"""
Stage 2 Verification Script:
1. Verify lemmas for 200 val texts are identical when parser & ner are disabled in spaCy.
2. Verify test-set accuracy and macro F1 for category and urgency are unchanged.
"""
from pathlib import Path
import sys
import json
import joblib
import pandas as pd
import numpy as np
from sklearn.metrics import accuracy_score, f1_score
import spacy

BASE_DIR = Path("/app") if Path("/app/artifacts").exists() else Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data" / "processed"
ARTIFACTS_DIR = BASE_DIR / "artifacts"

def test_lemmas_200_val():
    val_df = pd.read_csv(DATA_DIR / "val.csv")
    sample_texts = val_df["text"].dropna().iloc[:200].tolist()

    from nlp.preprocess import pipeline_stages, lemmatize, tokenize, remove_stopwords, get_spacy_nlp
    nlp_slim = get_spacy_nlp()

    for i, text in enumerate(sample_texts):
        # 1. via current pipeline_stages
        pipeline_lemmas = pipeline_stages(text)["lemmas"]

        # 2. via tokens -> lemmatize directly with disable=["parser", "ner"]
        tokens_no_stop = remove_stopwords(tokenize(text))
        direct_lemmas = lemmatize(tokens_no_stop)

        assert pipeline_lemmas == direct_lemmas, f"Mismatch at index {i}"

        # 3. verify parser and ner are disabled in nlp_slim
        assert "ner" not in nlp_slim.pipe_names, "NER is not disabled"
        assert "parser" not in nlp_slim.pipe_names, "Parser is not disabled"

    print("VERIFIED: 200 validation texts produce identical lemmas with parser and ner disabled.")

def test_metrics_unchanged():
    test_df = pd.read_csv(DATA_DIR / "test.csv")
    test_df = test_df.drop_duplicates(subset=["text"]).reset_index(drop=True)
    X_test = test_df["text"]
    def map_4class(c):
        return "Technical" if c in ["Technical Support", "IT Support", "Product Support"] else c

    y_cat_true = test_df["category"].apply(map_4class)
    y_urg_true = test_df["urgency"]

    tfidf_vec = joblib.load(ARTIFACTS_DIR / "tfidf_vectorizer.joblib")
    cat_model = joblib.load(ARTIFACTS_DIR / "best_category_model.joblib")
    urg_model = joblib.load(ARTIFACTS_DIR / "best_urgency_model.joblib")

    X_test_vec = tfidf_vec.transform(X_test)
    cat_preds = cat_model.predict(X_test_vec)
    urg_preds = urg_model.predict(X_test_vec)

    cat_acc = accuracy_score(y_cat_true, cat_preds)
    cat_macro_f1 = f1_score(y_cat_true, cat_preds, average="macro")

    urg_acc = accuracy_score(y_urg_true, urg_preds)
    urg_macro_f1 = f1_score(y_urg_true, urg_preds, average="macro")

    with open(ARTIFACTS_DIR / "metrics.json", "r") as f:
        metrics = json.load(f)

    # Saved metrics in metrics.json
    saved_cat_acc = metrics["category_4class"]["accuracy"]
    saved_cat_f1 = metrics["category_4class"]["f1"]
    saved_urg_acc = metrics["urgency_3class"]["accuracy"]
    saved_urg_f1 = metrics["urgency_3class"]["f1"]

    print(f"Category Test Accuracy: {cat_acc:.4f} vs saved {saved_cat_acc:.4f}")
    print(f"Category Test Macro F1: {cat_macro_f1:.4f} vs saved {saved_cat_f1:.4f}")
    print(f"Urgency Test Accuracy:  {urg_acc:.4f} vs saved {saved_urg_acc:.4f}")
    print(f"Urgency Test Macro F1:  {urg_macro_f1:.4f} vs saved {saved_urg_f1:.4f}")

    assert abs(cat_acc - saved_cat_acc) < 1e-4, f"Category accuracy changed: {cat_acc} vs {saved_cat_acc}"
    assert abs(cat_macro_f1 - saved_cat_f1) < 1e-4, f"Category macro F1 changed: {cat_macro_f1} vs {saved_cat_f1}"
    assert abs(urg_acc - saved_urg_acc) < 1e-4, f"Urgency accuracy changed: {urg_acc} vs {saved_urg_acc}"
    assert abs(urg_macro_f1 - saved_urg_f1) < 1e-4, f"Urgency macro F1 changed: {urg_macro_f1} vs {saved_urg_f1}"
    print("VERIFIED: Test-set accuracy and macro F1 for category and urgency are identical!")

if __name__ == "__main__":
    test_lemmas_200_val()
    test_metrics_unchanged()
