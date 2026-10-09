"""
Entity extraction service for TicketIQ (Stage 2: Slim regex-only extraction).
Extracts:
- ORDER_ID: regex patterns like #ORD-12345, ORD-1234, #123456
- AMOUNT: currency patterns like $149.99, $29.99/month, $2,499.00
- ERROR_CODE: regex patterns like ERR_AUTH_503, HW-ERR-7291, E-4012, HTTP-500
- DATE: formatted date patterns (e.g., Oct 1, 2026-10-09, 10/09/2026)
- EMAIL: email addresses like user@example.com
"""
import re
from typing import Dict, List

ORDER_ID_PATTERN = re.compile(
    r"\b(?:#?ORD[-\s]?\d{4,8}|ACC[-\s]?\d{4,8}|TCK[-\s]?\d{4,8}|TK[-\s]?\d{4,8}|#\d{5,8})\b",
    re.IGNORECASE,
)
ERROR_CODE_PATTERN = re.compile(
    r"\b(?:[A-Z]{2,}_[A-Z0-9_]{3,}|[A-Z]{2,}-[A-Z]{2,}-\d{3,}|ERR[_-][A-Z0-9]+|E-\d{3,4}|HTTP[-\s]?\d{3}|error\s+code\s+[A-Z0-9\-]+|v\d+\.\d+(?:\.\d+)?)\b",
    re.IGNORECASE,
)
AMOUNT_PATTERN = re.compile(
    r"\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?(?:/(?:month|mo|year|yr))?",
    re.IGNORECASE,
)
DATE_PATTERN = re.compile(
    r"\b(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,\s*\d{4})?|\d{4}-\d{2}-\d{2}|\d{1,2}/\d{1,2}/\d{2,4})\b",
    re.IGNORECASE,
)
EMAIL_PATTERN = re.compile(
    r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
    re.IGNORECASE,
)


def extract_entities(text: str) -> List[Dict[str, any]]:
    if not text:
        return []

    entities = []
    seen_spans = set()

    def add_entity(ent_text: str, label: str, start: int, end: int):
        # Prevent overlapping spans
        span = (start, end)
        if any(not (end <= s or start >= e) for (s, e) in seen_spans):
            return
        seen_spans.add(span)
        entities.append({
            "text": ent_text,
            "label": label,
            "start": start,
            "end": end,
        })

    # 1. Regex Order IDs
    for m in ORDER_ID_PATTERN.finditer(text):
        add_entity(m.group(), "ORDER_ID", m.start(), m.end())

    # 2. Regex Amounts
    for m in AMOUNT_PATTERN.finditer(text):
        add_entity(m.group(), "AMOUNT", m.start(), m.end())

    # 3. Regex Error codes
    for m in ERROR_CODE_PATTERN.finditer(text):
        add_entity(m.group(), "ERROR_CODE", m.start(), m.end())

    # 4. Regex Dates
    for m in DATE_PATTERN.finditer(text):
        add_entity(m.group(), "DATE", m.start(), m.end())

    # 5. Regex Emails
    for m in EMAIL_PATTERN.finditer(text):
        add_entity(m.group(), "EMAIL", m.start(), m.end())

    entities.sort(key=lambda x: x["start"])
    return entities
