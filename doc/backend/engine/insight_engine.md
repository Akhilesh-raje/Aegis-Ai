# backend/engine/insight_engine.py Documentation

## Purpose
`insight_engine.py` represents the "Elite V6" decision layer of AegisAI. It acts as a triple-layer correlation engine that synthesizes telemetry, rule hits, and threat intelligence into actionable security signals and a unified system narrative.

## Key Features
- **Triple-Layer Decision Mesh**: Correlates data across three distinct analytical layers:
    - **Rules Engine Correlation**: Matches events against static and dynamic security rules.
    - **Threat Intel v3 Correlation**: Cross-references internal/external threat intelligence.
    - **Exposure Auditing**: Scans active connections for risky public-facing listening ports (e.g., SSH on 0.0.0.0).
- **Actionable Remediation**: Each generated signal includes a suggested remediation action (e.g., `isolate_host`, `block_ip`, `patch_firewall`) with details on impact and recommended steps.
- **ML Behavioral Integration**: Ingests findings from the Neural engine to present behavioral anomalies as high-confidence signals.
- **Dynamic Posture Scoring**:
    - Calculates a real-time "Cyber Posture" score (0-100).
    - Tracks risk "Trajectory" (direction and rate of change).
    - Generates a natural language "Attack Narrative" to summarize the current situation for human analysts.
- **Confidence Scoring**: Provides a detailed breakdown of the engine's reasoning, including event counts and entropy deviation metrics.

## Implementation Details
- `get_security_signals()`: The primary execution method that produces the comprehensive v6 decision output.
- `_audit_exposure()`: A specialized auditor that identifies "Shadow IT" or accidental service exposures.
- Integrates with `rules_engine`, `intel_engine`, `telemetry_engine`, and the `database`.

## Usage
Used by the main backend stream to broadcast high-level intelligence on the `INSIGHTS` WebSocket channel every 5 seconds.
