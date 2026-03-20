# verify_soar_v2.py Documentation

## Purpose
`verify_soar_v2.py` tests the advanced policy-driven response logic of the SOAR v2 system. It verifies that mitigation actions are filtered through a `PolicyEngine` that considers asset criticality and threat context before execution.

## Key Features
- **Policy Filtering**: Demonstrates how actions are approved or held based on the target asset (e.g., Workstation vs. Critical DB Tier).
- **Auto-Execution Logic**: Confirms that approved actions (like `block_ip` on a workstation) are passed to the `ResponseEngine` for execution.
- **Safety Guards**: Verifies that "Manual Approval" or "Hold" states are triggered for high-risk actions on sensitive infrastructure.

## Implementation Details
- imports `policy_engine` and `ResponseEngine`.
- Tests two distinct scenarios:
    1. Brute force on a workstation (typically auto-approved).
    2. Exfiltration on a critical DB (typically requires manual intervention or a safety hold).
- Uses the `evaluate()` method of the `policy_engine` to get a structured verdict.

## Dependencies
- `backend.engine.policy_engine`: The rule-based arbiter for security actions.
- `backend.engine.response_engine`: The component that executes approved mitigations.

## Usage
```bash
python verify_soar_v2.py
```
Ensures that the autonomous response system respects organizational safety boundaries and asset sensitivity.
