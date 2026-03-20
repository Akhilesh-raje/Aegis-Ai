# swarm_adversarial_test.py Documentation

## Purpose
`swarm_adversarial_test.py` validates the "Swarm" multi-persona AI analysis by injecting a staged APT (Advanced Persistent Threat) scenario. It tests if the backend can aggregate multiple distinct threat signals and produce a unified "Commander" verdict via WebSockets.

## Key Features
- **Multi-Stage Injection**:
    - **Stage 1**: C2 Beaconing (Network threat).
    - **Stage 2**: Privilege Escalation via LSASS dump (Endpoint threat).
- **Database Injection**: Uses `sqlite3` to insert threats directly into the `threats` table.
- **WebSocket Verification**: Listens on the `AI_DECISIONS` channel to capture the final aggregated response from the "Aegis Commander Swarm".

## Implementation Details
- `inject_threat()`: Helper function for database insertion with unique `SWARM-` IDs.
- `simulate_apt()`: Asynchronous orchestrator that injects stages and waits for the broadcast.
- Uses a 4-second sleep between stages to simulate a realistic progression and allow the AI engine to process the first signal.

## Dependencies
- `websockets`: For real-time monitoring of AI decisions.
- `sqlite3`: For threat injection.

## Usage
```bash
python swarm_adversarial_test.py
```
This test is critical for ensuring that the "Decision Layer" (Elite Advisor V6) correctly synthesizes information from various security personas.
