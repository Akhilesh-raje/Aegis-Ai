# verify_hardening.py Documentation

## Purpose
`verify_hardening.py` is a security validation script for the "AegisAI v4 Telemetry Hardening" layer. It tests the cryptographic signing and verification logic used to ensure the integrity of telemetry data and prevent replay attacks.

## Key Features
- **Signature Generation**: Demonstrates how to generate a signature for a JSON payload using a timestamp.
- **Integrity Verification**: Confirms that valid payloads with matching signatures pass verification.
- **Tamper Detection**: Validates that modifying any part of the payload (e.g., changing the user from "alice" to "attacker") causes verification to fail.
- **Replay Attack Prevention**: Verifies that signatures with old timestamps (e.g., 2 minutes old) are rejected, even if the payload is otherwise valid.

## Implementation Details
- Imports `generate_signature` and `verify_signature` from `backend.engine.crypto`.
- Uses `assert` statements to programmatically check for expected pass/fail outcomes.
- Simulates clock skew by subtracting 120 seconds from the current timestamp for the replay test.

## Dependencies
- `backend.engine.crypto`: The cryptographic core of the telemetry protection system.

## Usage
```bash
python verify_hardening.py
```
This script confirms that the underlying security primitives protecting the data stream are robust.
