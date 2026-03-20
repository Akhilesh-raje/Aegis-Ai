# backend/engine/threat_intel_engine.py Documentation

## Purpose
`threat_intel_engine.py` provides the "Reputation Layer" for AegisAI. It correlates real-time connection events with known malicious indicators (Cyber Threat Intelligence - CTI) to catch known active threats instantaneously.

## Key Features
- **IP Reputation Auditing**: Maintains a database of known malicious IP addresses (e.g., C2 servers, botnet nodes, known brute-forcers).
- **Instant Correlation**: Flags any `NET_CONNECTION_ESTABLISHED` event to a malicious endpoint as a `critical` threat.
- **Deterministic Detection**: Unlike behavioral ML, this engine provides 100% confidence "True Positive" signals based on established threat data.
- **MITRE Alignment**: Automatically maps rep-hits to tactics like `Command and Control`.

## Implementation Details
- `ThreatIntelEngine.analyze()`: Scans normalized events for IP-basedrep-hits.
- Uses a local `malicious_ips` dictionary (mocked in the prototype with real-world threat indicators).

## Usage
Queried by the `InsightEngine` as one of the three primary layers in the "Elite V6 Decision Mesh".
