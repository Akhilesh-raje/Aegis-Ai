# inject_graph_data.py Documentation

## Purpose
`inject_graph_data.py` is a simple utility script used to populate the AegisAI graph visualization with a sequence of related security events. It simulates an attack lifecycle (Initial Access -> Execution -> C2 -> Lateral Movement -> Exfiltration) by sending HTTP POST requests to the simulation injection endpoint.

## Key Features
- **Event Sequencing**: Definess a list of 6 events that tell a story of a compromise:
    1. `USER_LOGIN` (Observation)
    2. `PROCESS_SPAWN` (Anomaly: powershell.exe)
    3. `NET_OUTBOUND` (Threat: Unauthorized IP)
    4. `USER_LOGIN` (Threat: Lateral movement to DB server)
    5. `NET_OUTBOUND` (Critical: Exfiltration from DB server)
    6. `FILE_ACCESS` (Critical: Database dump access)
- **API Interaction**: Uses `urllib.request` to send JSON payloads to `http://localhost:8000/api/simulate/inject`.

## Implementation Details
- Iterates through the `events` list and sends one request every 0.5 seconds.
- Uses `classification` field (observation, anomaly, threat, critical) to drive UI-level styling in the graph.

## Dependencies
- `urllib.request`: For simple synchronous HTTP requests.
- `json`: For payload serialization.

## Usage
```bash
python inject_graph_data.py
```
Run this while the backend is active to see nodes and links appear in the "Visual Intelligence" or "Graph" view of the frontend.
