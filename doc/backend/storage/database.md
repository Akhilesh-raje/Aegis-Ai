# backend/storage/database.py Documentation

## Purpose
`database.py` is the "Reliability Layer" of AegisAI. It manages the persistent state of the entire system, including threat history, risk trends, user identities, administrative audit logs, and AI conversation memory.

## Key Features
- **Multi-Table SQLite Schema**:
    - `threats`: Detailed records of every detected and mitigated incident.
    - `risk_history`: Temporal snapshots of the system-wide risk score.
    - `events`: A "Warm Storage" buffer for raw telemetry.
    - `users` & `webhooks`: Configuration state for access control and integrations.
    - `audit_log`: A tamper-evident record of all sensitive system changes.
    - `ai_conversations`: Persistent multi-turn memory for the AI Advisor.
- **Warm-to-Cold Data Rotation**: Automatically monitors the `events` table. When capacity exceeds 1,000 records, it migrates the oldest 200 events to a "Cold Storage" JSONL archive (`aegis_archive.jsonl`) to maintain high-performance queries.
- **Self-Seeding Identity**: Automatically initializes the database with default `admin` and `analyst` accounts on the first run.
- **Thread-Safe JSON Serialization**: Transparently handles the transformation of complex Python dictionaries (ML features, probabilities, indicators) into JSON strings for SQLite storage.
- **Audit Integration**: Every administrative change (e.g., adding a user or resetting the system) is automatically committed to the `audit_log` with a system-wide timestamp.

## Implementation Details
- `Database.rotate_data()`: The core logic for managing storage overhead.
- `get_threats()` / `get_threat_by_id()`: High-level query interface used by the API and Dashboard.
- `insert_chat_message()`: Stores the context necessary for the AI's "Swarm Memory."

## Usage
Initialized as a global singleton in `backend/main.py`. It is the source of truth for all data-driven components in the AegisAI ecosystem.
