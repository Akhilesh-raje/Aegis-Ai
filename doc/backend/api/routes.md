# backend/api/routes.py Documentation

## Purpose
`routes.py` is the primary interface between the AegisAI backend and the frontend dashboard. It defines the RESTful endpoints for manual actions and the unified WebSocket gateway for all real-time telemetry, threats, and AI interactions.

## Key Features
- **Unified WebSocket Gateway (`/api/ws`)**: A single, high-concurrency entry point that replaces multiple legacy SSE and polling endpoints. It handles:
    - Real-time telemetry and system stats.
    - AI Advisor narratives and Chat interactions.
    - Security signal and Threat broadcasts.
    - Graph and Identity updates.
- **AI-Powered Chat Integration**: Orchestrates the asynchronous streaming of AI tokens from the `AegisAIEngine` to the frontend over WebSockets.
- **Attack Simulation Control**: Provides endpoints to trigger both one-off and stateful (MITRE-mapped) attack emulations for testing and training.
- **SOAR Action Execution (`/api/respond`)**: Receives analyst-triggered remediation commands and dispatches them to the `ResponseEngine`.
- **Forensic Reporting**: Generates on-the-fly, printable HTML Executive Briefings for specific security incidents.
- **System Lifecycle Management**: Includes endpoints for system health checks (`/api/ai/status`) and full state resets (`/api/reset`).

## Implementation Details
- `init_routes()`: Injects the shared application state (models, engines, database) into the router.
- `websocket_endpoint()`: Manages the lifecycle of WebSocket connections and dispatches incoming messages (e.g., AI Chat queries).
- Integration with `backend.simulator.log_generator` for manual attack injection.

## Usage
The router is included in the main FastAPI application in `backend/main.py`. It serves as the "Front Door" for all analyst interactions.
