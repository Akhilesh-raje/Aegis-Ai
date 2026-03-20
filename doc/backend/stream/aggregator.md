# backend/stream/aggregator.py Documentation

## Purpose
`stream/aggregator.py` is the "Real-Time Pulse" of AegisAI. While similar to the ML aggregator, this version is specifically optimized for high-concurrency production streams, featuring enhanced field resilience and better support for the `AegisEvent` telemetry format.

## Key Features
- **Production-Grade Field Parsing**: Implements a robust `gf` (Get Field) helper that checks both top-level and nested `data` dictionaries, ensuring detection logic doesn't break if agents send slightly varied JSON structures.
- **Simultaneous Time-Format Support**: Gracefully handles timestamps in both ISO-8601 string format and Unix floating-point representations.
- **Enriched Feature Context**: In addition to core ML features, it extracts metadata like `agent_id` and `is_simulation` to assist in routing and visualization.
- **Adaptive Geo-Anomaly Detection**: Flags metadata from known suspicious regions (e.g., Tor Exit Nodes, Lagos, Pyongyang) as numerical signals for the ML detector.

## Comparison to `ml/aggregator.py`
- **Stream Aggregator**: Optimized for real-time inference, includes meta-data extraction (`agent_id`), and features a "resilience-first" parsing logic.
- **ML Aggregator**: Primarily used for offline training and batch simulation processing.

## Implementation Details
- `AggregationEngine._compute_window()`: The analytical core that calculates the "Elite 9" features (Login rate, Port diversity, etc.).
- `session_variation`: Computes the coefficient of variation in payload sizes—a key indicator for distinguishing human activity from automated botnets/C2 traffic.

## Usage
Used by the `MLWorker` to process the live WebSocket event stream into actionable vectors for the Anomaly Detector.
