# backend/ml/detector.py Documentation

## Purpose
`detector.py` is the "First Responder" of the AegisAI pipeline. It implements unsupervised anomaly detection using an Isolation Forest model to identify any behavioral pattern that deviates significantly from the system's "known-good" baseline.

## Key Features
- **Isolation Forest Detection**: Highly effective at identifying outliers in high-dimensional security telemetry without requiring historical labels.
- **Unsupervised Learning**: Learns the "Pulse" of a specific host environment and flags any "Isolation" (outlier) as a potential threat.
- **Anomaly Scoring**: Returns a standardized `anomaly_score` (higher = more outlier) for every 5-second window.
- **Confidence Mapping**: Translates raw decision scores into a human-understandable 0-100% confidence signal.
- **Baseline Training**: Provides a simple `fit()` interface to "lock in" the current system behavior as the normal baseline.

## Implementation Details
- `AnomalyDetector.detect()`: The primary pipeline method that returns `is_anomaly` flags and scores.
- `contamination`: Configurable hyperparameter (default 0.15) defining the expected ratio of outliers in the data.

## Usage
Acts as the "Trigger" for the entire AegisAI engine. Only events flagged as anomalies by this detector are passed to the `Classifier` and `DecisionEngine` for further scrutiny.
