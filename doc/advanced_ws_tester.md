# advanced_ws_tester.py Documentation

## Purpose
`advanced_ws_tester.py` is a diagnostic tool designed to perform deep WebSocket efficiency and integrity testing on the AegisAI backend. It monitors the real-time data stream, validates payload schemas, and metrics throughput and latency.

## Key Features
- **Real-time Monitoring**: Connects to `ws://localhost:8000/api/ws` and listens for all broadcasted messages.
- **Schema Validation**: Validates the structure of incoming payloads for various channels:
    - `TELEMETRY`: System, network, and context data.
    - `STATS`: Overall event and threat statistics.
    - `THREATS`: List of active threats.
    - `INSIGHTS`: Verdicts and scores from the AI engine.
    - `FLEET`: Fleet management data.
    - `IDENTITY`: Identity-related events.
    - `GRAPH`: Node and link data for the graph visualization.
    - `RISK_HISTORY`: Historical risk scores.
- **Performance Metrics**:
    - **Throughput**: Calculates KB/s transfer rate.
    - **Latency**: Tracks time between consecutive messages on each channel.
    - **Jitter**: Calculates standard deviation of latency to measure consistency.
- **Live CLI UI**: Provides a real-time summary of incoming packets and current channel activity.
- **Detailed Reporting**: Generates a comprehensive summary at the end of the test duration (default 30s), highlighting any schema violations.

## Implementation Details
- Uses `asyncio` and `websockets` for asynchronous communication.
- Implements a `ChannelMetrics` class to store state for each channel.
- Uses `statistics` module for latency and jitter calculations.
- Provides a `Colors` class for enhanced terminal output.

## Dependencies
- `websockets`: For WebSocket client functionality.
- `asyncio`: For asynchronous execution.
- `json`: For payload parsing.

## Usage
Run the script to start a 30-second diagnostic session:
```bash
python advanced_ws_tester.py
```
Ensure the AegisAI backend is running and accessible at `ws://localhost:8000/api/ws`.
