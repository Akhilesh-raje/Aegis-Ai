# backend/engine/response_engine.py Documentation

## Purpose
`response_engine.py` is the execution arm of AegisAI's SOAR system. it manages the lifecycle of containment actions, maintains a list of currently blocked/locked entities, and enforces a strict "Infrastructure Safelist" to prevent self-denial of service.

## Key Features
- **Containment Execution**: Implements logic for various response actions:
    - `block_ip`: Adds an IP to the block list.
    - `lock_account`: Disables a user identity.
    - `isolate_host`: Prevents further network communication for a node.
    - `kill_process`: Terminates specific suspicious PIDs.
- **Infrastructure Safelist Protection**: Prevents the system from accidentally blocking critical infrastructure (e.g., Gateways, DNS, Key Databases).
- **Threat-Specific Recommendations**: Provides a mapping of common threat types (e.g., Brute Force, DDoS, Exfiltration) to their prioritized responses.
- **Action Logging**: Maintains a chronological history of all attempted, executed, and rejected actions for auditing.
- **Human-in-the-Loop Integration**: Distinguishes between `auto` vs `manual` actions, allowing for analyst override.

## Implementation Details
- `INFRASTRUCTURE_SAFELIST`: A hardcoded set of protected IPs that the engine will refuse to `block_ip`.
- `execute_action()`: Validates the action against the safelist and records the result in the global `action_log`.
- Tracks global state via `blocked_ips` and `locked_accounts` sets.

## Dependencies
- `backend.engine.policy_engine`: (Integrated via main app flow) to determine approval modes.

## Usage
The global `response_engine` instance is the final authority for executing remediation. Its action history is broadcast to the dashboard via periodic telemetry updates.
