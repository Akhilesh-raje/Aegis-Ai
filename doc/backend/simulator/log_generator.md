# backend/simulator/log_generator.py Documentation

## Purpose
`log_generator.py` is the "Stress Tester" and "Data Foundation" of AegisAI. It generates realistic, high-fidelity security events to simulate both baseline system activity and sophisticated multi-stage cyber attacks.

## Key Features
- **Audit-Grade Telemetry Hardening**: Every generated event includes a unique `nonce`, `agent_id`, and a **HMAC-SHA256 cryptographic signature** to demonstrate a tamper-proof telemetry pipeline.
- **Realistic Identity Context**: Uses a pool of 20+ normal and administrative users with specific job roles (e.g., DevOps Engineer, Security Analyst) to create meaningful activity logs.
- **Sophisticated Attack Simulation**:
    - **Brute Force**: High-frequency failed login attempts against admin accounts from suspicious IPs.
    - **DDoS**: Volumetric network requests with large payloads from distributed suspicious sources.
    - **Port Scan**: Sequential service probes across the full 65k port range.
    - **Exfiltration**: Anomalous file access and large data transfers from compromised internal sessions.
- **Geospatial Realism**: Maps events to both "Normal" (e.g., London, New York) and "Suspicious" (e.g., Tor Exit Nodes, known risky regions) locations.
- **Ensemble Mapping**: Exports an `ATTACK_GENERATORS` dictionary, allowing the API to trigger specific scenarios on demand.

## Implementation Details
- `_make_event()`: The master template for consistent, schema-compliant event generation.
- Uses `secrets.token_hex` for secure nonce generation and `backend.engine.crypto.generate_signature` for integrity hardening.
- Supports `is_simulation` flags to help downstream engines distinguish synthetic data from live host telemetry.

## Usage
Used by the `/api/simulate-attack` endpoint for live demonstrations and by the `ml.classifier` training loop to generate labeled datasets.
