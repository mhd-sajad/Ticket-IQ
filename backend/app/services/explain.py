"""
Explanation module for linear models using coefficient * TF-IDF feature attribution.
Extracts top contributing words for category and urgency predictions.
"""
from typing import Dict, List
import numpy as np
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS

CUSTOM_STOPS = {"hello", "hi", "dear", "please", "thanks", "thank", "would", "like"}
ALL_STOPS = set(ENGLISH_STOP_WORDS).union(CUSTOM_STOPS)


def is_all_stopwords(phrase: str) -> bool:
    tokens = phrase.lower().split()
    return all(tok in ALL_STOPS for tok in tokens)


def explain_prediction(text: str, model, vectorizer, predicted_class: str, top_n: int = 10) -> List[Dict[str, any]]:
    """
    Computes linear feature contributions: weight = coef[class_idx, j] * tfidf[j]
    Returns top_n words sorted by weight descending, filtering out unigram/ngram stop words.
    """
    if not hasattr(model, "coef_") or not hasattr(vectorizer, "transform"):
        return []

    classes = list(model.classes_)
    if predicted_class not in classes:
        return []

    class_idx = classes.index(predicted_class)
    X = vectorizer.transform([text])
    feature_names = np.array(vectorizer.get_feature_names_out())

    nz_indices = X.indices
    nz_values = X.data

    if len(nz_indices) == 0:
        return []

    coefs = model.coef_[class_idx, nz_indices]
    contributions = coefs * nz_values

    # Sort descending by contribution
    sorted_order = np.argsort(contributions)[::-1]

    explanations = []
    seen_words = set()
    for idx in sorted_order:
        feat_name = str(feature_names[nz_indices[idx]])
        # Skip unigrams that are stop words and n-grams made entirely of stop words
        if is_all_stopwords(feat_name):
            continue
        if feat_name in seen_words:
            continue
        seen_words.add(feat_name)
        weight = float(contributions[idx])
        explanations.append({
            "word": feat_name,
            "weight": round(weight, 4),
        })
        if len(explanations) >= top_n:
            break

    return explanations
