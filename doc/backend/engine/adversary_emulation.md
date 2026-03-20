# backend/engine/adversary_emulation.py Documentation

## Purpose
`adversary_emulation.py` is the core simulation engine of AegisAI. It provides stateful, multi-step attack scenarios mapped to MITRE ATT&CK techniques, allowing users to test the platform's detection and response capabilities in a controlled environment.

## Key Features
- **Scenario-Based Simulations**: Supports complex, multi-stage attack chains:
    - **Ransomware Chain**: Reconnaissance (T1046) -> Credential Access (T1110) -> Lateral Movement (T1021) -> Impact (T1486).
    - **Data Exfil & Lateral**: Initial Access (T1078) -> Exfiltration (T1041).
- **MITRE ATT&CK Mapping**: Every simulation step is explicitly mapped to a standard MITRE technique ID.
- **Stateful Execution**: Tracks the `status` (running, completed, error) and `current_step` of each simulation.
- **Buffer Injection**: Generates synthetic events and injects them into the application's `simulation_events` queue for processing by the ML pipeline.

## Implementation Details
- `AdversaryEmulationEngine.start_simulation()`: Entry point that spawns a background `asyncio` task for the requested scenario.
- Uses `_make_event` from `backend.simulator.log_generator` to ensure simulated events match the schema of real telemetry.
- Integrates with `fleet_manager` to set the `is_simulation_active` flag on affected nodes, which can be used to adjust risk scaling or UI visuals.

## Dependencies
- `backend.simulator.log_generator`: For consistent event generation.
- `backend.engine.fleet_manager`: To update node simulation status.

## Usage
Triggered via the `/api/simulate/start` endpoint. View active simulations on the `SIMULATION` WebSocket channel.
