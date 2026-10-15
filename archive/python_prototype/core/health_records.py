"""
health_records.py — PashuMitra AI
------------------------------------
Local SQLite database for Pashu Health Cards.
Innovation 3: Animal health history stored privately on device.

Privacy principles:
- No data leaves the device
- Consent obtained before storing
- No unnecessary personal information collected
- Users can delete their records at any time
"""

import sqlite3
import json
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "pashumitra.db"


def get_connection():
    """Get SQLite connection with proper settings."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row  # Return dict-like rows
    return conn


def init_database():
    """Create tables if they don't exist."""
    with get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS animals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nickname TEXT,
                species TEXT NOT NULL,
                approximate_age TEXT,
                notes TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                consent_given INTEGER DEFAULT 1
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS health_observations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                animal_id INTEGER,
                observation_date TEXT,
                symptoms TEXT,
                query TEXT,
                response_summary TEXT,
                urgency_level TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (animal_id) REFERENCES animals(id)
            )
        """)
        conn.commit()


def add_animal(nickname: str, species: str, age: str = "", notes: str = "") -> int:
    """Add a new animal record. Returns the new animal ID."""
    init_database()
    with get_connection() as conn:
        cursor = conn.execute(
            """INSERT INTO animals (nickname, species, approximate_age, notes, consent_given)
               VALUES (?, ?, ?, ?, 1)""",
            (nickname or f"{species}_{datetime.now().strftime('%d%m%y')}", species, age, notes)
        )
        conn.commit()
        return cursor.lastrowid


def get_animals() -> list:
    """Get all stored animals."""
    init_database()
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM animals ORDER BY created_at DESC"
        ).fetchall()
        return [dict(row) for row in rows]


def add_observation(
    animal_id: int,
    symptoms: str,
    query: str,
    response_summary: str,
    urgency_level: str,
    observation_date: str | None = None,
) -> int:
    """Add a health observation for an animal."""
    init_database()
    if not observation_date:
        observation_date = datetime.now().strftime("%Y-%m-%d")

    with get_connection() as conn:
        cursor = conn.execute(
            """INSERT INTO health_observations
               (animal_id, observation_date, symptoms, query, response_summary, urgency_level)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (animal_id, observation_date, symptoms, query, response_summary, urgency_level)
        )
        conn.commit()
        return cursor.lastrowid


def get_animal_history(animal_id: int) -> list:
    """Get all health observations for a specific animal."""
    init_database()
    with get_connection() as conn:
        rows = conn.execute(
            """SELECT * FROM health_observations
               WHERE animal_id = ?
               ORDER BY observation_date DESC""",
            (animal_id,)
        ).fetchall()
        return [dict(row) for row in rows]


def delete_animal(animal_id: int) -> bool:
    """Delete an animal and all its observations (right to deletion)."""
    init_database()
    with get_connection() as conn:
        conn.execute("DELETE FROM health_observations WHERE animal_id = ?", (animal_id,))
        conn.execute("DELETE FROM animals WHERE id = ?", (animal_id,))
        conn.commit()
    return True


def get_recent_observations(limit: int = 10) -> list:
    """Get recent observations across all animals."""
    init_database()
    with get_connection() as conn:
        rows = conn.execute(
            """SELECT ho.*, a.nickname, a.species
               FROM health_observations ho
               JOIN animals a ON ho.animal_id = a.id
               ORDER BY ho.created_at DESC
               LIMIT ?""",
            (limit,)
        ).fetchall()
        return [dict(row) for row in rows]
