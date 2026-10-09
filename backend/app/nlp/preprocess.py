"""
Shared preprocessing module for TicketIQ.
Used by training pipelines and live API endpoints.

Functions:
- normalize: lowercase, strip URLs, emails, HTML, collapse whitespace, preserve error codes / IDs / amounts
- tokenize: extract word and special domain tokens
- remove_stopwords: filter non-informative stopwords
- lemmatize: spaCy lemmatization
- pipeline_stages: returns {raw, normalized, tokens, without_stopwords, lemmas}
"""
import re
from typing import Dict, List, Optional
import spacy

# Load spaCy once on module import
_NLP = None


def get_spacy_nlp():
    global _NLP
    if _NLP is None:
        # Disable heavy components for fast preprocessing
        _NLP = spacy.load("en_core_web_sm", disable=["parser", "ner"])
    return _NLP


# Precompiled regex patterns
RE_URL = re.compile(r"https?://\S+|www\.\S+", re.IGNORECASE)
RE_EMAIL = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")
RE_HTML = re.compile(r"<[^>]+>")
# Preserve alphanumerics, hashtags (#ORD-123), dollars ($149.99), hyphens (E-4012), underscores (ERR_AUTH_503)
RE_CLEAN_CHARS = re.compile(r"[^\w\s#\-$.@]")
RE_WHITESPACE = re.compile(r"\s+")

# Token regex: handles words, error codes, amounts ($149.99), order IDs (#ORD-123)
RE_TOKEN = re.compile(r"[#$]?[A-Za-z0-9]+(?:[-_.:][A-Za-z0-9]+)*")

# Domain-specific sentiment / negation words to keep even if standard stopword lists drop them
RETAIN_WORDS = {"not", "no", "never", "again", "cant", "cannot", "wont", "dont", "urgent", "still", "off", "down"}

# Default stopwords based on spaCy stop words minus retained words
_STOPWORDS = None


def get_stopwords() -> set:
    global _STOPWORDS
    if _STOPWORDS is None:
        nlp = get_spacy_nlp()
        _STOPWORDS = {w.lower() for w in nlp.Defaults.stop_words if w.lower() not in RETAIN_WORDS}
        # Add basic punctuation/junk stopwords
        _STOPWORDS.update({"hi", "hello", "dear", "thanks", "thank", "please", "regards", "sincerely"})
    return _STOPWORDS


def normalize(text: str) -> str:
    """
    Clean and normalize raw text:
    - Strip URLs, emails, and HTML tags
    - Clean unusual symbols while retaining error codes, order IDs, currency symbols
    - Collapse extra whitespace
    - Lowercase
    """
    if not text:
        return ""

    t = RE_HTML.sub(" ", text)
    t = RE_URL.sub(" ", t)
    t = RE_EMAIL.sub(" ", t)
    t = RE_CLEAN_CHARS.sub(" ", t)
    t = RE_WHITESPACE.sub(" ", t).strip()
    return t.lower()


def tokenize(text: str) -> List[str]:
    """Extract tokens from normalized or raw text."""
    norm = normalize(text)
    if not norm:
        return []
    matches = RE_TOKEN.findall(norm)
    return [m.lower() for m in matches if len(m) > 1 or m.isalnum()]


def remove_stopwords(tokens: List[str]) -> List[str]:
    """Remove standard stopwords while preserving negation and domain cues."""
    stopwords = get_stopwords()
    return [t for t in tokens if t not in stopwords and len(t) > 1]


def lemmatize(tokens: List[str]) -> List[str]:
    """Lemmatize tokens using spaCy."""
    if not tokens:
        return []
    nlp = get_spacy_nlp()
    # Process joined tokens as a single document for speed
    doc = nlp(" ".join(tokens))
    lemmas = []
    for token in doc:
        lemma = token.lemma_.lower()
        if lemma and lemma.strip():
            lemmas.append(lemma)
    return lemmas


def pipeline_stages(raw: str) -> Dict[str, object]:
    """
    Execute full pipeline stages and return formatted dictionary
    matching the frontend's PipelineStages interface:
    {
      raw: str,
      normalized: str,
      tokens: list[str],
      without_stopwords: list[str],
      lemmas: list[str]
    }
    """
    raw_str = raw or ""
    norm = normalize(raw_str)
    tokens = tokenize(norm)
    no_stop = remove_stopwords(tokens)
    lemmas = lemmatize(no_stop)

    return {
        "raw": raw_str,
        "normalized": norm,
        "tokens": tokens,
        "without_stopwords": no_stop,
        "lemmas": lemmas,
    }
