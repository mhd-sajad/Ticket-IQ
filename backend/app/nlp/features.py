"""
Feature extraction and Sentiment/Frustration scoring module.
Combines NLTK VADER sentiment with rule-based frustration signals.
"""
import re
from typing import Dict, List, Tuple
from nltk.sentiment.vader import SentimentIntensityAnalyzer

_SIA = None


def get_vader() -> SentimentIntensityAnalyzer:
    global _SIA
    if _SIA is None:
        _SIA = SentimentIntensityAnalyzer()
    return _SIA


# High-frustration keyword patterns
FRUSTRATION_KEYWORDS = [
    r"\bunacceptable\b",
    r"\bstill not\b",
    r"\bagain\b",
    r"\bwaiting\b",
    r"\bridiculous\b",
    r"\bfrustrat(?:ed|ing|ion)\b",
    r"\bterrible\b",
    r"\bworst\b",
    r"\bdisgusted\b",
    r"\basap\b",
    r"\bimmediately\b",
    r"\burgent\b",
    r"\bdisaster\b",
    r"\blawyer\b",
    r"\bscam\b",
    r"\brip[- ]?off\b",
    r"\bchargeback\b",
    r"\bnever again\b",
    r"\bhorrible\b",
]
RE_FRUSTRATION = re.compile("|".join(FRUSTRATION_KEYWORDS), re.IGNORECASE)


def compute_sentiment_and_frustration(text: str) -> Dict[str, object]:
    """
    Computes VADER sentiment and custom frustration score (0.0 to 1.0).
    Returns:
    {
      "label": "positive" | "negative" | "neutral",
      "score": float (frustration / negative intensity between 0 and 1),
      "compound": float,
      "frustration_score": float
    }
    """
    raw = text or ""
    if not raw.strip():
        return {
            "label": "neutral",
            "score": 0.0,
            "compound": 0.0,
            "frustration_score": 0.0,
        }

    sia = get_vader()
    scores = sia.polarity_scores(raw)
    compound = scores["compound"]
    neg_score = scores["neg"]

    # Frustration cues
    # 1. Multiple exclamation marks
    excl_count = raw.count("!")
    excl_factor = min(0.3, excl_count * 0.08)

    # 2. ALL CAPS ratio in tokens
    words = re.findall(r"[A-Za-z]{2,}", raw)
    caps_words = [w for w in words if w.isupper() and w not in {"OK", "ID", "API", "URL", "HR", "IT", "VPN", "SSO"}]
    caps_ratio = len(caps_words) / max(1, len(words))
    caps_factor = min(0.3, caps_ratio * 0.8)

    # 3. Frustration keyword matches
    matches = len(RE_FRUSTRATION.findall(raw))
    keyword_factor = min(0.4, matches * 0.15)

    # Combined frustration score (0.0 - 1.0)
    base_neg = neg_score
    if compound < -0.1:
        base_neg = max(base_neg, abs(compound) * 0.8)

    frustration = min(1.0, max(0.0, base_neg * 0.6 + excl_factor + caps_factor + keyword_factor))

    # Determine sentiment label:
    if frustration >= 0.45 or compound <= -0.1:
        label = "negative"
        display_score = round(max(frustration, abs(compound) if compound < 0 else 0.5), 2)
    elif compound >= 0.15 and frustration < 0.25:
        label = "positive"
        display_score = round(compound, 2)
    else:
        label = "neutral"
        display_score = round(float(scores["neu"]), 2)

    return {
        "label": label,
        "score": display_score,
        "compound": round(compound, 3),
        "frustration_score": round(frustration, 3),
    }


def extract_frustration_feature(texts: List[str]) -> List[float]:
    """Vectorized helper returning frustration score for a list of texts."""
    return [compute_sentiment_and_frustration(t)["frustration_score"] for t in texts]
