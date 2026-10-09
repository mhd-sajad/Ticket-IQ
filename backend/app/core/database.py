"""
SQLite Database layer for TicketIQ.
Manages:
- tickets: historical and newly triaged tickets
- review_queue: tickets requiring human review / low-confidence predictions
- feedback: user-submitted corrections
"""
import json
from pathlib import Path
import sqlite3
from typing import Dict, List, Optional
import pandas as pd

from app.core.config import DB_PATH, SEED_CSV_PATH, DATA_DIR


def get_db_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tickets (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        category TEXT NOT NULL,
        category_confidence REAL NOT NULL,
        urgency TEXT NOT NULL,
        urgency_confidence REAL NOT NULL,
        sentiment_label TEXT NOT NULL,
        sentiment_score REAL NOT NULL,
        entities_json TEXT NOT NULL,
        suggested_resolution TEXT,
        created_at TEXT NOT NULL
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS review_queue (
        id TEXT PRIMARY KEY,
        ticket_id TEXT,
        text TEXT NOT NULL,
        predicted_category TEXT NOT NULL,
        predicted_urgency TEXT NOT NULL,
        corrected_category TEXT,
        corrected_urgency TEXT,
        status TEXT NOT NULL,
        confidence REAL NOT NULL,
        created_at TEXT NOT NULL
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id TEXT NOT NULL,
        actual_category TEXT,
        actual_urgency TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    conn.commit()

    # Prepopulate if tickets table is empty
    cursor.execute("SELECT COUNT(*) FROM tickets;")
    count = cursor.fetchone()[0]
    
    # Priority: seed_tickets.csv (3,000 exact rows), then all_clean.csv
    seed_file = SEED_CSV_PATH if SEED_CSV_PATH.exists() else (DATA_DIR / "all_clean.csv")
    if count == 0 and seed_file.exists():
        print(f"Prepopulating SQLite tickets table from {seed_file.name}...", flush=True)
        df = pd.read_csv(seed_file)
        sample_df = df.head(3000).copy()

        rows = []
        for _, r in sample_df.iterrows():
            t_id = str(r["ticket_id"])
            text = str(r["text"])
            cat = str(r["category"])
            if cat in ["Technical Support", "IT Support", "Product Support"]:
                cat = "Technical"
            urg = str(r["urgency"])
            created_at = str(r.get("created_at", "2026-10-01 12:00:00"))

            rows.append((
                t_id,
                text,
                cat,
                0.85,
                urg,
                0.80,
                "negative" if urg in ["High", "Critical"] else "neutral",
                0.65,
                json.dumps([]),
                "Standard resolution applied via support workflow.",
                created_at,
            ))

        cursor.executemany("""
        INSERT OR IGNORE INTO tickets (
            id, text, category, category_confidence, urgency, urgency_confidence,
            sentiment_label, sentiment_score, entities_json, suggested_resolution, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, rows)

        # Prepopulate sample review queue items
        review_items = [
            ("RV-001", "TCK-10025", "I was billed $59.99 for a product I returned two weeks ago. The refund hasn't appeared.", "Billing and Payments", "Medium", "Returns and Exchanges", "High", "pending", 0.52, "2026-10-07T14:23:00Z"),
            ("RV-002", "TCK-10042", "Smart thermostat keeps dropping connection after firmware update to v3.2.", "Technical", "Low", None, None, "pending", 0.48, "2026-10-07T11:05:00Z"),
            ("RV-003", "TCK-10088", "Cannot access team workspace after SSO configuration update. Error 503.", "Customer Service", "Medium", "Technical", "High", "used_for_retraining", 0.41, "2026-10-06T09:45:00Z"),
            ("RV-004", "TCK-10091", "Need to change shipping address for order #ORD-55612 before dispatch.", "Customer Service", "Low", "Customer Service", "Medium", "used_for_retraining", 0.55, "2026-10-06T16:30:00Z"),
            ("RV-005", "TCK-10114", "Website timed out during checkout. Card charged $234.50 but no order confirmation.", "Technical", "High", "Billing and Payments", "Critical", "pending", 0.38, "2026-10-07T08:12:00Z"),
        ]
        cursor.executemany("""
        INSERT OR IGNORE INTO review_queue (
            id, ticket_id, text, predicted_category, predicted_urgency,
            corrected_category, corrected_urgency, status, confidence, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, review_items)

        conn.commit()
        print(f"Prepopulated {len(rows)} historical tickets and {len(review_items)} review items.", flush=True)

    conn.close()


def insert_ticket(ticket_data: Dict[str, any]):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO tickets (
        id, text, category, category_confidence, urgency, urgency_confidence,
        sentiment_label, sentiment_score, entities_json, suggested_resolution, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        ticket_data["id"],
        ticket_data["text"],
        ticket_data["category"],
        ticket_data["category_confidence"],
        ticket_data["urgency"],
        ticket_data["urgency_confidence"],
        ticket_data["sentiment"]["label"],
        ticket_data["sentiment"]["score"],
        json.dumps(ticket_data.get("entities", [])),
        ticket_data.get("suggested_resolution") or "",
        ticket_data["created_at"],
    ))

    # If low confidence (< 0.60), flag for review queue
    min_conf = min(ticket_data["category_confidence"], ticket_data["urgency_confidence"])
    if min_conf < 0.60:
        cursor.execute("""
        INSERT OR IGNORE INTO review_queue (
            id, ticket_id, text, predicted_category, predicted_urgency,
            corrected_category, corrected_urgency, status, confidence, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            f"RV-{ticket_data['id'][-4:]}",
            ticket_data["id"],
            ticket_data["text"],
            ticket_data["category"],
            ticket_data["urgency"],
            None,
            None,
            "pending",
            min_conf,
            ticket_data["created_at"],
        ))

    conn.commit()
    conn.close()


def insert_feedback(ticket_id: str, actual_category: Optional[str], actual_urgency: Optional[str], notes: Optional[str]):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO feedback (ticket_id, actual_category, actual_urgency, notes)
    VALUES (?, ?, ?, ?);
    """, (ticket_id, actual_category, actual_urgency, notes))

    # Update review queue if present
    cursor.execute("""
    UPDATE review_queue
    SET corrected_category = COALESCE(?, corrected_category),
        corrected_urgency = COALESCE(?, corrected_urgency),
        status = 'reviewed'
    WHERE ticket_id = ? OR id = ?;
    """, (actual_category, actual_urgency, ticket_id, ticket_id))

    conn.commit()
    conn.close()


def get_review_items() -> List[Dict[str, any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM review_queue ORDER BY created_at DESC LIMIT 50;")
    rows = cursor.fetchall()
    items = []
    for r in rows:
        items.append({
            "id": r["id"],
            "text": r["text"],
            "predicted_category": r["predicted_category"],
            "predicted_urgency": r["predicted_urgency"],
            "corrected_category": r["corrected_category"],
            "corrected_urgency": r["corrected_urgency"],
            "status": r["status"],
            "created_at": r["created_at"],
            "confidence": round(float(r["confidence"]), 2),
        })
    conn.close()
    return items
