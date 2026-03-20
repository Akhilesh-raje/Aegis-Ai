# backend/engine/rules_engine.py Documentation

## Purpose
`rules_engine.py` provides a fast, signature-based detection layer for well-known attack patterns and system misconfigurations. It complements the ML-based detection by catching "noisy" or "deterministic" threats with high accuracy and low latency.

## Key Features
- **Heuristic Pattern Matching**: Efficiently identifies common security violations:
    - **Management Port Exposure**: Flags external access to critical ports (22, 3389, 445, 5900).
    - **Connection Flooding**: Detects abnormally high frequencies of outbound connections from a single node (>50 in 60s).
    - **Resource Saturation**: Alerts on extreme CPU usage (>95%) that may indicate DoS or cryptomining.
- **Frequency Analysis**: Tracks per-node event counters over sliding time windows to detect rate-based anomalies.
- **MITRE Tactic Mapping**: Each rule hit is mapped to an appropriate MITRE tactic (e.g., Initial Access, Impact, Exfiltration).

## Implementation Details
- `RulesEngine.analyze()`: Processes a normalized `AegisEvent` and returns a `rule_hit` dictionary if a heuristic threshold is crossed.
- Uses internal `node_counters` to maintain temporal state for rate-limiting logic.

## Usage
Initialized as a global singleton and called by the `InsightEngine` to correlate raw telemetry with known bad patterns.
