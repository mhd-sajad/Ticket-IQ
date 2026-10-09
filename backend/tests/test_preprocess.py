"""
Tests for NLP preprocessing module
"""
from app.nlp.preprocess import normalize, tokenize, remove_stopwords, lemmatize, pipeline_stages


def test_normalize():
    raw = "Hello! Check <a href='https://example.com'>link</a> or email user@test.com. Error ERR_AUTH_503 on #ORD-123 ($49.99)."
    norm = normalize(raw)
    assert "https://example.com" not in norm
    assert "user@test.com" not in norm
    assert "<a" not in norm
    assert "err_auth_503" in norm
    assert "#ord-123" in norm
    assert "$49.99" in norm


def test_tokenize():
    text = "Error E-4012 occurred on order #ORD-29481 with amount $2499.00"
    tokens = tokenize(text)
    assert "e-4012" in tokens
    assert "#ord-29481" in tokens
    assert "$2499.00" in tokens


def test_remove_stopwords():
    tokens = ["the", "system", "is", "not", "working", "properly"]
    filtered = remove_stopwords(tokens)
    assert "system" in filtered
    assert "not" in filtered  # Negation preserved
    assert "the" not in filtered
    assert "is" not in filtered


def test_lemmatize():
    tokens = ["running", "crashes", "batteries"]
    lemmas = lemmatize(tokens)
    assert "run" in lemmas
    assert "crash" in lemmas
    assert "battery" in lemmas


def test_pipeline_stages_shape():
    sample = "I was charged $149.99 twice for order #ORD-38712. Please refund ASAP!"
    stages = pipeline_stages(sample)
    assert "raw" in stages
    assert "normalized" in stages
    assert "tokens" in stages
    assert "without_stopwords" in stages
    assert "lemmas" in stages

    assert stages["raw"] == sample
    assert isinstance(stages["tokens"], list)
    assert isinstance(stages["without_stopwords"], list)
    assert isinstance(stages["lemmas"], list)
    assert len(stages["tokens"]) >= len(stages["without_stopwords"])
