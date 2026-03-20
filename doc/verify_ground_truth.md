# verify_ground_truth.py Documentation

## Purpose
`verify_ground_truth.py` is a comprehensive audit script designed to validate the "Infrastructure Purity" of AegisAI. It checks the internal state of various backend engines (Fleet, Identity, Graph, Exposure) to ensure that mock or synthetic data has been successfully purged and replaced with real-time telemetry from the host system.

## Key Features
- **Fleet Audit**: Lists all registered nodes and their hostnames to ensure only authentic agents are present.
- **Identity Audit**: Dumps detected user principals and their calculated risk scores.
- **Graph Purity Check**: Scans the `graph_engine` for hardcoded mock nodes (e.g., `AEGIS_CORE`, `DB_PROD_MAIN`) and flags errors if they still exist.
- **Exposure Analytics Audit**: Verifies that the `insight_engine` is correctly detecting open ports and exposed services on the current machine.
- **Risk Verdict Summary**: Provides a final system health score and a list of the top detected security issues.

## Implementation Details
- Imports and initializes the full suite of backend engines: `TelemetryEngine`, `InsightEngine`, `RiskScorer`, `rules_engine`, `intel_engine`, `identity_engine`, `graph_engine`, `fleet_manager`.
- Directly queries the `Database` and singleton engine instances.
- Sets the project root in `sys.path` to ensure absolute imports work correctly during script execution.

## Dependencies
- All core backend `engine` modules.
- `backend.storage.database`: For raw data verification.

## Usage
```bash
python verify_ground_truth.py
```
This is the definitive script for confirming that AegisAI is operating as a 100% authentic monitor of the local host environment.
