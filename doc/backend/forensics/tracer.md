# backend/forensics/tracer.py Documentation

## Purpose
`tracer.py` (The Forensics Tracer) provides AegisAI with "Post-Detection Eyes." It automates the collection of deep-system evidence—such as memory dumps and network packet captures—at the exact moment a critical threat is identified, ensuring that volatile evidence is preserved for an analyst's review.

## Key Features
- **Automated Memory Dumps**: Captures the full RAM state of a specific malicious Process ID (PID). In a production environment, this integrates with tools like `procdump.exe` to enable offline Volatility analysis.
- **Rolling PCAP Capture**: Initiates a high-fidelity network packet trace for a specific duration (e.g., 30 seconds) targeting the malicious source IP, providing an exact transcript of the attack's network communications.
- **The Forensics Vault**: Automatically manages a structured directory (`forensics_vault`) for storing evidence files, ensuring they are separated from regular system logs.
- **Sentinel Integration**: Designed to be triggered automatically by the `DecisionEngine` when certainty of a "Critical" threat (like Exfiltration) meets the autonomy threshold.

## Implementation Details
- `ForensicsTracer.capture_memory_dump()`: Handles the PID-targeted RAM capture.
- `capture_pcap()`: Manages the timed network buffer trace.
- Uses `logging` to record every evidence collection attempt in the system-wide security log.

## Future Hooks
The current implementation provides a robust framework and filesystem-level "Simulated" evidence generation, with clear integration points for `tshark` (network) and `Sysinternals` (memory) in production deployments.

## Usage
Invoked by the `DecisionEngine` as part of the "Actionable Response" chain for high-severity incidents.
