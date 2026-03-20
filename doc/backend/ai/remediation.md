# backend/ai/remediation.py Documentation

## Purpose
`remediation.py` (The Sentinel) is the "Safe Execution Layer" of AegisAI. It provides the low-level controllers for host-based response actions, ensuring that mitigations are performed safely, logged accurately, and prevented from affecting critical system processes.

## Key Features
- **Host-Level Response Actions**: Implements the technical logic for common mitigations:
    - `terminate_process`: Kills suspicious PIDs using `psutil`.
    - `block_ip`: Dynamically adds outbound block rules to the **Windows Firewall** using `netsh`.
    - `quarantine_file`: (Mocked) Logic for isolating malicious executables.
- **Fail-Safe Mechanism**: Hardcoded protection for critical system processes (e.g., `explorer.exe`, `svchost.exe`, `services.exe`) to prevent accidental OS instability.
- **Execution Logging**: Maintains a history of all attempted actions, their arguments, and their results (success/failure + detail).
- **Subprocess Integration**: Safely executes shell commands for system-level configuration while capturing and logging all error outputs.

## Implementation Details
- `RemediationController.execute_action()`: The dispatcher that maps high-level engine commands to low-level technical actions.
- Uses `psutil` for robust process management and `subprocess` for firewall interaction.

## Safety Note
All remediation actions are performed with administrative context (if the backend is run as admin). The Fail-Safe list is a critical protection against "AI hallucination" or policy errors.

## Usage
The `sentinel` global instance is invoked by the `DecisionEngine` when a mitigation is approved (either manually or via Autonomy Mode).
