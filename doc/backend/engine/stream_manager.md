# backend/engine/stream_manager.py Documentation

## Purpose
`stream_manager.py` is the "Communications Hub" of AegisAI. It manages high-concurrency WebSocket connections and ensures that real-time security data is delivered to the dashboard with minimal latency and maximum efficiency.

## Key Features
- **Priority-Based Broadcasting**: Uses an `asyncio.PriorityQueue` to prioritize critical alerts (e.g., `AI_DECISIONS`, `THREATS`) over lower-priority telemetry (e.g., `GRAPH`, `STATS`).
- **Delta Update Detection**: Automatically hashes outgoing data for each channel and skips broadcasting if the data hasn't changed, significantly reducing network overhead.
- **Channel-Based Architecture**: Organizes data into logical streams (`TELEMETRY`, `IDENTITY`, `AI_ADVISOR`, etc.), allowing frontends to subscribe to only what they need.
- **Resilient Connection Management**: Automatically detects and cleans up "dead" or broken sockets without interrupting other active streams.
- **State Synchronization**: Sends the most recent cached state to new clients immediately upon connection, ensuring a "zero-wait" dashboard experience.

## Implementation Details
- `WebSocketManager`: An asynchronous, thread-safe manager that utilizes `asyncio.gather` for parallel broadcasting.
- `_broadcast_worker()`: A dedicated background task that pulls from the priority queue to prevent blocking the main telemetry loop.
- Uses `hashlib.md5` for fast object-level delta checking.

## Channel Priorities
- `0-15 (High)`: Decisions, Threats, Chat.
- `50-60 (Medium)`: Insights, Telemetry.
- `90-100 (Low)`: Stats, Identity, Graph, Simulation.

## Usage
The `ws_manager` global instance is used throughout the backend (in `main.py`, `worker.py`, etc.) to push updates to the SOC Command Center.
