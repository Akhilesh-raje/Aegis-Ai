# backend/ml/aggregator.py Documentation

## Purpose
`aggregator.py` is the "Temporal Focal Point" of the AegisAI ML pipeline. It converts a high-velocity stream of individual events into structured 5-second behavioral windows, grouped by the source entity (IP address or Node).

## Key Features
- **Sliding Window Aggregation**: Groups events into discrete 5-second pulses to provide a stable "behavioral snapshot" for analysis.
- **Entity-Based Grouping**: Dynamically partitions the event stream by `source_ip` or `source_node`, allowing the system to track behavior per-actor.
- **Behavioral Metric Computation**: Calculates 9 core security features for every window:
    - **Authentication**: Login attempt rate and failure ratio.
    - **Reconnaissance**: Unique ports accessed.
    - **Traffic Profile**: Average payload size and connection frequency.
    - **Identity Diversity**: Count of unique user accounts used.
    - **Automation Indicators**: "Session Variation" (coefficient of variation in payload sizes).
    - **Contextual Signals**: Hour of day and Geolocation anomalies (Mismatches against known-risky regions).
- **Graceful Handling of Sparse Data**: Provides `_empty_window` logic to maintain a consistent feature schema even when activity is low.

## Implementation Details
- `AggregationEngine.aggregate()`: The main entry point for batch or streaming events.
- `_compute_window()`: The analytical logic that derives floating-point features from raw event properties.

## Usage
Used by the main telemetry stream and the ML Training loop to prepare data for the `Preprocessor`.
