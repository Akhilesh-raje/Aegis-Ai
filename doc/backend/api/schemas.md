# backend/api/schemas.py Documentation

## Purpose
`schemas.py` defines the "Data Contract" for the AegisAI API. It uses Pydantic to enforce strict type validation and provide clear documentation for all request and response payloads.

## Key Models
- **Request Schemas**:
    - `AttackSimulationRequest`: Defines the type and intensity for manual threat injection.
    - `ResponseActionRequest`: Standardizes the format for analyst remediation commands (action, threat_id, target).
- **Response Schemas**:
    - `StatsResponse`: Aggregates system metrics, threat counts, and uptime for the dashboard's "At-a-Glance" view.
    - `ThreatResponse`: The comprehensive schema for a detected security incident, including detection metadata, MITRE mapping, and recommendations.
    - `ModelInfoResponse`: Exposes the versioning and feature-usage metadata of the ML pipeline.
    - `ResponseActionResponse`: Communicates the result of an attempted mitigation (executed vs failed).
- **Utility Schemas**:
    - `RiskHistoryEntry`: Represents a single point in the temporal risk graph.

## Implementation Details
- Inherits from `pydantic.BaseModel` to leverage automatic JSON serialization and clear API documentation (Swagger/Redoc).
- Uses `Optional` types to handle varying data availability across different detection engines.

## Usage
Imported by `backend/api/routes.py` and `backend/main.py` to type-hint endpoint return values and validate incoming POST bodies.
