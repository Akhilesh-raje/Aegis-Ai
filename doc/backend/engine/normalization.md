# backend/engine/normalization.py Documentation

## Purpose
`normalization.py` is the "Data Foundry" of AegisAI. It maps raw, heterogeneous telemetry from system metrics, network connections, and security engines into a unified, hardened `AegisEvent` schema.

## Key Features
- **Unified Event Schema (AegisEvent)**: Standardizes all signals with common metadata:
    - Unique `id` (UUID).
    - Precise `timestamp`.
    - `source_node` and `source_identity` (Principal).
    - Hierarchical `severity` and `privilege_level`.
    - `signature` (for v4 telemetry hardening).
    - `is_simulation` flag.
- **Multi-Source Mapping**:
    - **Resource Metrics**: Converts `psutil` stats into `METRIC_CPU_USAGE` and `METRIC_MEM_USAGE` events.
    - **Network Connections**: Maps `psutil` net-connections into `NET_CONNECTION` events.
    - **Security Signals**: Ingests observations from analysts or other engines as `SECURITY_SIGNAL` events.
- **Identity Context Extraction**: Automatically identifies the primary OS user or service context for every event.
- **Generic Log Normalization**: Provides utility methods for mapping simulation logs or external files into the internal event format.

## Implementation Details
- `AegisEvent.to_dict()`: Ensures a consistent dictionary representation for JSON serialization and database storage.
- `EventNormalizer.normalize_telemetry()`: The main conversion logic used by the streaming tasks.
- Maps `LISTEN` status network connections to a higher initial severity (1).

## Usage
Used as the final processing step for raw data before it is sent to the database, truth engines, or the dashboard.
