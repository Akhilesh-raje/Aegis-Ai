# backend/engine/security_insights.py Documentation

## Purpose
`security_insights.py` (Legacy/Supplementary) provides an infrastructure-wide security audit layer. While superseded in some roles by the "Elite V6" `InsightEngine`, it contains specialized logic for OS-level hygiene and surface area auditing.

## Key Features
- **Surface Area Auditing**: Directly queries `psutil` to identify risky listening ports (e.g., FTP, SSH, RDP) bound to the local machine.
- **Network Safety Monitoring**: Detects the absence of VPN tunnels and flags potential metadata exposure to ISPs.
- **OS Health Baseline**: Monitors CPU usage spikes as a proxy for "hidden" resource-intensive threats like cryptojacking.
- **Software Hygiene Audit**: Analyzes Windows OS Application logs to detect high error rates that may indicate service failure or tampering.
- **Storage Maintenance**: (Mocked) Flags unpurged temporary directories and old cache files for analyst cleanup.
- **Composite Scoring**: Implements a deduction-based scoring system (starting at 100) to provide a simple "Verdict" (SECURE, ELEVATED, VULNERABLE, CRITICAL).

## Implementation Details
- `SecurityInsightsEngine.get_security_insights()`: Aggregates telemetry and stats into a detailed list of "Observations".
- Uses a simplified deduction logic compared to the risk-adaptive `PolicyEngine`.

## Usage
Used as a supplementary audit tool or maintained for backward compatibility with earlier versions of the AegisAI dashboard.
