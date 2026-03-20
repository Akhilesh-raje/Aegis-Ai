# backend/engine/policy_engine.py Documentation

## Purpose
`policy_engine.py` implements the "Rules of Engagement" for AegisAI's SOAR (Security Orchestration, Automation, and Response) system. it governs whether an autonomous action should be executed based on the severity of the threat and the sensitivity of the target asset.

## Key Features
- **Elite SOAR v2.5 Policies**: Pre-defined logic for common scenarios:
    - **Night-Watch Policy**: Automatically isolates hosts for high-risk threats detected during non-business hours (22:00-06:00).
    - **Daytime Protection**: Automatically kills suspicious processes on low-sensitivity workstations.
    - **Critical Infrastructure Policy**: Always mandates manual review for any action against a critical asset (e.g., `Critical_DB_Tier`).
- **Risk-Adaptive Tuning**: Dynamically lowers the threshold for autonomous action by 15% if the overall system risk is significantly elevated (>60).
- **Asset Criticality Awareness**: Maps asset types to numerical criticality levels (1-5) to inform policy decisions.
- **Time-Context Awareness**: Supports time-windowed policies to adjust the "defensive posture" based on the hour of the day.

## Implementation Details
- `ResponsePolicy`: A configuration class defining thresholds, actions, and approval modes.
- `PolicyEngine.evaluate()`: The core decision method that selects the most aggressive applicable policy for a given threat.
- Returns a decision object including `action`, `mode` (autonomous vs manual), and the `policy_id` that triggered it.

## Asset Criticality Mapping
- `Critical_DB_Tier`: 5
- `Command_Console`: 4
- `Public_Gateway`: 3
- `Workstation`: 1

## Usage
Used by the `DecisionEngine` and `ResponseEngine` to validate suggested mitigations before they are broadcast or executed.
