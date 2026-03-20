# backend/main.py Documentation

## Purpose
`backend/main.py` is the central entry point for the AegisAI backend. It initializes all core components (AI engines, ML models, storage, telemetry), trains initial models on synthetic data, and orchestrates real-time data streaming via FastAPI and WebSockets.

## Key Features
- **Component Initialization**: Bootstraps the entire system, including:
    - **AI Brain**: `AegisAIEngine` and `KnowledgeStore`.
    - **ML Pipeline**: `AnomalyDetector` (Isolation Forest) and `ThreatClassifier` (Random Forest).
    - **Analytical Engines**: `TelemetryEngine`, `RiskScorer`, `InsightEngine`, `FleetManager`, `IdentityEngine`, etc.
    - **Storage**: `Database` (SQLite).
- **ML Model Training**: Automatically generates and trains models on 1,000+ baseline and synthetic attack samples at startup to ensure the system is "ready-to-defend" immediately.
- **Multiplexed Streaming**: Runs five independent asynchronous tasks to broadcast data on various WebSocket channels:
    - `TELEMETRY + STATS` (3s cycle)
    - `THREATS + INSIGHTS` (5s cycle)
    - `FLEET + IDENTITY` (10s cycle)
    - `GRAPH + RISK_HISTORY` (15s cycle)
    - `SIMULATION` (5s cycle)
- **Event-Driven AI Analysis**: Triggers heavy AI reasoning tasks (advisories and decisions) in the background when risk spikes or new threats are detected, ensuring the main telemetry loop remains non-blocking.
- **Forensic Ring Buffer**: Maintains a `recent_events` buffer for real-time log streaming to the frontend.

## Implementation Details
- Uses `FastAPI` with an `asynccontextmanager` (lifespan) to manage the startup and shutdown of background tasks.
- Implements `AggregationEngine` to group raw events into time windows for ML analysis.
- Leverages `MLWorker` for offloading compute-intensive threat classification.
- Uses `uvicorn` as the ASGI server.

## Dependencies
- `FastAPI`: The web framework.
- `uvicorn`: The ASGI server.
- `backend.ai.*`, `backend.engine.*`, `backend.ml.*`, `backend.simulator.*`, `backend.storage.*`, `backend.stream.*`.

## Usage
Start the backend using:
```bash
python main.py
```
The API documentation is accessible at `http://localhost:8000/docs`.
