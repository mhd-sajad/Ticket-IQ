"""
NLP Pipeline stages generator for TicketIQ frontend visualization:
1. raw: raw input text
2. normalized: lowercased, cleaned text
3. tokens: tokenized words
4. without_stopwords: filtered tokens
5. lemmas: lemmatized tokens
"""
from typing import Dict
import spacy
from app.nlp.preprocess import normalize

_nlp = None


def get_spacy_nlp():
    global _nlp
    if _nlp is None:
        try:
            _nlp = spacy.load("en_core_web_sm", disable=["ner", "parser"])
        except Exception:
            _nlp = None
    return _nlp


def generate_pipeline_stages(text: str) -> Dict[str, any]:
    norm_text = normalize(text)
    nlp = get_spacy_nlp()

    if nlp is not None:
        doc = nlp(norm_text)
        tokens = [token.text for token in doc if not token.is_space and not token.is_punct]
        without_stopwords = [token.text for token in doc if not token.is_space and not token.is_punct and not token.is_stop]
        lemmas = [token.lemma_ for token in doc if not token.is_space and not token.is_punct and not token.is_stop]
    else:
        # Fallback simple tokenizer
        import re
        tokens = re.findall(r"\b\w+\b", norm_text)
        without_stopwords = [t for t in tokens if len(t) > 2]
        lemmas = without_stopwords

    return {
        "raw": text,
        "normalized": norm_text,
        "tokens": tokens[:40],
        "without_stopwords": without_stopwords[:40],
        "lemmas": lemmas[:40],
    }
