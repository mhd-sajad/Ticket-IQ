"""
Preprocessing and tokenization functions for TicketIQ.
"""
import sys
from app.nlp.preprocess import (
    lemmatize,
    normalize,
    pipeline_stages,
    remove_stopwords,
    tokenize,
)
import app.nlp.preprocess as _preprocess

sys.modules.setdefault("nlp.preprocess", _preprocess)

__all__ = [
    "lemmatize",
    "normalize",
    "pipeline_stages",
    "remove_stopwords",
    "tokenize",
]
