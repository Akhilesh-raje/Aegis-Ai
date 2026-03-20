"""
SQLite Storage Layer
Hot store for threat history, event logs, and risk scores.
"""

import sqlite3
import json
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Optional


DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "aegis.db")


class Database:
    """SQLite storage for AegisAI threat and event data."""

    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        """Create tables if they don't exist."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS threats (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                threat_type TEXT NOT NULL,
                severity TEXT NOT NULL,
                confidence REAL NOT NULL,
                source_ip TEXT NOT NULL,
                target_user TEXT,
                geo TEXT,
                anomaly_score REAL,
                explanation TEXT,
                indicators TEXT,
                recommendation TEXT,
                features TEXT,
                probabilities TEXT,
                mitre_id TEXT,
                mitre_name TEXT,
                mitre_tactic TEXT,
                status TEXT DEFAULT 'active',
                is_simulation INTEGER DEFAULT 0,
                response_action TEXT
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS risk_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                score REAL NOT NULL,
                level TEXT NOT NULL
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                event_type TEXT NOT NULL,
                source_ip TEXT,
                raw_data TEXT
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                user_id TEXT NOT NULL,
                action TEXT NOT NULL,
                target TEXT,
                details TEXT
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS webhooks (
                id TEXT PRIMARY KEY,
                url TEXT NOT NULL,
                added_by TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ai_conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL
            )
        """)

        conn.commit()
        
        # Seed default admin if user table empty
        cursor.execute("SELECT COUNT(*) FROM users")
        if cursor.fetchone()[0] == 0:
            import hashlib
            import uuid
            admin_pw = hashlib.sha256("admin".encode()).hexdigest()
            cursor.execute(
                "INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)",
                (str(uuid.uuid4()), "admin", admin_pw, "admin", datetime.now(timezone.utc).isoformat())
            )
            analyst_pw = hashlib.sha256("analyst".encode()).hexdigest()
            cursor.execute(
                "INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)",
                (str(uuid.uuid4()), "analyst", analyst_pw, "l1_analyst", datetime.now(timezone.utc).isoformat())
            )
            conn.commit()

        conn.close()
    def insert_event(self, event_type: str, source_ip: str, raw_data: dict):
        """Store a telemetry event in the Warm tier and trigger rotation if needed."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO events (timestamp, event_type, source_ip, raw_data) VALUES (?, ?, ?, ?)",
            (datetime.now(timezone.utc).isoformat(), event_type, source_ip, json.dumps(raw_data)),
        )
        cursor.execute("SELECT COUNT(*) FROM events")
        count = cursor.fetchone()[0]
        conn.commit()
        conn.close()

        if count > 1000:
            self.rotate_data()

    def rotate_data(self):
        """Rotate data from Warm (SQLite) to Cold (JSONL) storage."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        rotate_count = 200
        cursor.execute("SELECT * FROM events ORDER BY timestamp ASC LIMIT ?", (rotate_count,))
        old_events = cursor.fetchall()
        
        if not old_events:
            conn.close()
            return

        archive_path = self.db_path.replace(".db", "_archive.jsonl")
        with open(archive_path, "a") as f:
            for ev in old_events:
                f.write(json.dumps({
                    "id": ev[0], "timestamp": ev[1], "event_type": ev[2], 
                    "source_ip": ev[3], "raw_data": ev[4]
                }) + "\n")
        
        cursor.execute("DELETE FROM events WHERE id IN (SELECT id FROM events ORDER BY timestamp ASC LIMIT ?)", (rotate_count,))
        conn.commit()
        conn.close()

    def get_threats(self, limit: int = 100) -> list[dict]:
        """Get recent threats."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM threats ORDER BY timestamp DESC LIMIT ?",
            (limit,),
        )
        rows: list[dict[str, Any]] = [dict(row) for row in cursor.fetchall()]
        conn.close()

        # Parse JSON fields
        for row in rows:
            for field, default in [("indicators", []), ("features", {}), ("probabilities", {})]:
                try:
                    row[field] = json.loads(row.get(field, "") or ("[]" if default == [] else "{}"))
                except (json.JSONDecodeError, TypeError):
                    row[field] = default

        return rows

    def get_threat_by_id(self, threat_id: str) -> dict | None:
        """Get a single threat by ID."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM threats WHERE id = ?", (threat_id,))
        row = cursor.fetchone()
        conn.close()

        if row:
            result: dict[str, Any] = dict(row)
            for field, default in [("indicators", []), ("features", {}), ("probabilities", {})]:
                try:
                    result[field] = json.loads(result.get(field, "") or ("[]" if default == [] else "{}"))
                except (json.JSONDecodeError, TypeError):
                    result[field] = default
            return result
        return None

    def update_threat_status(self, threat_id: str, status: str, response_action: str | None = None):
        """Update threat status (e.g. active → mitigated)."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        if response_action:
            cursor.execute(
                "UPDATE threats SET status = ?, response_action = ? WHERE id = ?",
                (status, response_action, threat_id),
            )
        else:
            cursor.execute(
                "UPDATE threats SET status = ? WHERE id = ?",
                (status, threat_id),
            )
        conn.commit()
        conn.close()

    def insert_threat(self, threat: dict):
        """Store a detected threat."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO threats
            (id, timestamp, threat_type, severity, confidence, source_ip,
             target_user, geo, anomaly_score, explanation, indicators,
             recommendation, features, probabilities,
             mitre_id, mitre_name, mitre_tactic, status, is_simulation)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            threat["id"],
            threat.get("timestamp", datetime.now(timezone.utc).isoformat()),
            threat["threat_type"],
            threat["severity"],
            threat["confidence"],
            threat["source_ip"],
            threat.get("target_user", ""),
            threat.get("geo", ""),
            threat.get("anomaly_score", 0),
            threat.get("explanation", ""),
            json.dumps(threat.get("indicators", [])),
            threat.get("recommendation", ""),
            json.dumps(threat.get("features", {})),
            json.dumps(threat.get("probabilities", {})),
            threat.get("mitre_id", ""),
            threat.get("mitre_name", ""),
            threat.get("mitre_tactic", ""),
            threat.get("status", "active"),
            1 if threat.get("is_simulation", False) else 0,
        ))
        conn.commit()
        conn.close()

    def insert_risk_score(self, score: float, level: str):
        """Record a risk score snapshot."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO risk_history (timestamp, score, level) VALUES (?, ?, ?)",
            (datetime.now(timezone.utc).isoformat(), score, level),
        )
        conn.commit()
        cursor.execute(
            "INSERT INTO audit_log (timestamp, user_id, action, target, details) VALUES (?, ?, ?, ?, ?)",
            (datetime.now(timezone.utc).isoformat(), 'SYSTEM', 'reset', 'ALL', 'System wiped cleanly.')
        )
        conn.commit()
        conn.close()

    # --- Users & Webhooks ---
    
    def get_users(self) -> list[dict]:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT id, username, role, created_at FROM users ORDER BY created_at ASC")
        users = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return users
        
    def get_webhooks(self) -> list[dict]:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT id, url, added_by, created_at FROM webhooks ORDER BY created_at ASC")
        hook_list = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return hook_list

    def add_webhook(self, url: str, added_by: str) -> str:
        hook_id = str(uuid.uuid4())
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO webhooks (id, url, added_by, created_at) VALUES (?, ?, ?, ?)",
            (hook_id, url, added_by, datetime.now(timezone.utc).isoformat())
        )
        conn.commit()
        conn.close()
        return hook_id

    def delete_webhook(self, hook_id: str):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM webhooks WHERE id = ?", (hook_id,))
        conn.commit()
        conn.close()

    def add_user(self, username: str, password_hash: str, role: str) -> str:
        user_id = str(uuid.uuid4())
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)",
            (user_id, username, password_hash, role, datetime.now(timezone.utc).isoformat())
        )
        conn.commit()
        conn.close()
        return user_id

    def delete_user(self, user_id: str):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
        conn.commit()
        conn.close()

    def get_risk_history(self, limit: int = 100) -> list[dict]:
        """Get risk score timeline."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM risk_history ORDER BY timestamp DESC LIMIT ?",
            (limit,),
        )
        rows = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return rows

    def get_stats(self) -> dict:
        """Get aggregate stats."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM threats")
        total_threats = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM threats WHERE status = 'active'")
        active_threats = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM threats WHERE status = 'mitigated'")
        mitigated_threats = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM events")
        total_events = cursor.fetchone()[0]

        conn.close()

        return {
            "total_threats": total_threats,
            "active_threats": active_threats,
            "mitigated_threats": mitigated_threats,
            "total_events": total_events,
        }

    def clear_all(self):
        """Clear all data (for demo reset)."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM threats")
        cursor.execute("DELETE FROM risk_history")
        cursor.execute("DELETE FROM events")
        conn.commit()
        conn.close()

    def log_audit_action(self, user_id: str, action: str, target: str | None = None, details: str | None = None):
        """Record an administrative or security action in the audit log."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO audit_log (timestamp, user_id, action, target, details) VALUES (?, ?, ?, ?, ?)",
            (datetime.now(timezone.utc).isoformat(), user_id, action, target, details)
        )
        conn.commit()
        conn.close()

    # --- AI Conversation History ---

    def insert_chat_message(self, session_id: str, role: str, content: str):
        """Store a chat message for AI conversation history."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO ai_conversations (timestamp, session_id, role, content) VALUES (?, ?, ?, ?)",
            (datetime.now(timezone.utc).isoformat(), session_id, role, content)
        )
        conn.commit()
        conn.close()

    def get_chat_history(self, session_id: str, limit: int = 20) -> list[dict]:
        """Get recent chat history for a session."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM ai_conversations WHERE session_id = ? ORDER BY timestamp DESC LIMIT ?",
            (session_id, limit)
        )
        rows = [dict(row) for row in cursor.fetchall()]
        conn.close()
        rows.reverse()  # Return in chronological order
        return rows
