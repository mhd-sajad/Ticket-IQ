"""
Sentiment analysis module using NLTK VADER.
Returns:
- label: 'positive' | 'negative' | 'neutral'
- score: confidence/intensity float [0.0, 1.0]
"""
from typing import Dict
from nltk.sentiment.vader import SentimentIntensityAnalyzer

_analyzer = None


def get_vader_analyzer() -> SentimentIntensityAnalyzer:
    global _analyzer
    if _analyzer is None:
        _analyzer = SentimentIntensityAnalyzer()
    return _analyzer


def analyze_sentiment(text: str) -> Dict[str, any]:
    if not text or not text.strip():
        return {"label": "neutral", "score": 0.0}

    sia = get_vader_analyzer()
    scores = sia.polarity_scores(text)
    compound = float(scores["compound"])

    if compound <= -0.05:
        label = "negative"
        score = round(abs(compound), 2)
    elif compound >= 0.05:
        label = "positive"
        score = round(compound, 2)
    else:
        label = "neutral"
        score = round(float(scores["neu"]), 2)

    return {"label": label, "score": score}
