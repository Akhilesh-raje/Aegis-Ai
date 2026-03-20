# backend/engine/risk_scorer.py Documentation

## Purpose
`risk_scorer.py` implements the "Cyber Posture" logic of AegisAI. It translates raw security signals into a single, dynamic 0-100 "Risk Score" that represents the current security health of the system.

## Key Features
- **Weighted Severity Scoring**: Assigns different weights to threat types (e.g., Exfiltration: 35, DDoS: 30, Port Scan: 10).
- **Contextual Asset Scaling**: Multiplies risk contribution based on the sensitivity of the target asset (e.g., Critical DB: 2.5x, Workstation: 1.0x).
- **Temporal Decay**: Automatically decays the risk score over time (defaulting to a 0.95 factor every 5 seconds) if no new threats are detected, reflecting the diminishing relevance of old alerts.
- **Risk Level Categorization**: Maps numerical scores to human-readable levels: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
- **History Tracking**: Maintains a `deque` of recent score changes for real-time charting and forensic analysis.

## Implementation Details
- `RiskScorer.update()`: The core algorithm that processes new threats. It factors in `confidence`, `anomaly_score`, and `asset_type`.
- `RiskScorer.reduce()`: Allows for manual or programmed risk reduction (e.g., as a reward for successful mitigation).
- Uses `time.time()` tracking to apply decay only when necessary during score retrieval.

## Parameters
- `decay_rate`: Factor multiplied per 5-second period (default 0.95).
- `max_history`: Number of historical records to keep (default 100).

## Usage
Used by the `InsightEngine` and the main streaming tasks to provide real-time posture awareness on the `STATS` and `RISK_HISTORY` channels.
