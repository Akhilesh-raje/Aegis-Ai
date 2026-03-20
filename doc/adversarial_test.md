# adversarial_test.py Documentation

## Purpose
`adversarial_test.py` is a testing script used to verify the AI's response to a critical threat. it simulates an attack by injecting a "Ransomware" threat directly into the database and then monitors the WebSocket stream to confirm that both the Decision Engine and the AI Advisor trigger appropriate responses.

## Key Features
- **Threat Injection**: Programmatically inserts a critical ransomware threat into the `threats` table of the SQLite database (`backend/aegis.db`).
- **Real-time Verification**: Connects to the WebSocket and listens for `AI_DECISIONS` and `AI_ADVISOR` broadcasts.
- **Success Criteria**: Marks the test as successful only if both a decision (action/confidence/severity) and an advisory (narrative) are received within a 60-second timeout.

## Implementation Details
- `inject_critical_threat()`: Uses `sqlite3` to perform direct DB insertion.
- `monitor_ai_decisions()`: Uses `websockets` to wait for the broadcasted AI events.
- Uses `uuid` to generate unique threat identifiers.

## Dependencies
- `sqlite3`: For direct database interaction.
- `websockets`: For monitoring AI broadcasts.
- `asyncio`: For asynchronous orchestration.

## Usage
```bash
python adversarial_test.py
```
Requires the backend to be running to process the injected threat and broadcast the AI response.
