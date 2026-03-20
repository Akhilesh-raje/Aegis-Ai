# backend/engine/crypto.py Documentation

## Purpose
`crypto.py` provides the security foundation for AegisAI's telemetry streams. It implements "Audit-Grade Hardening" to ensure that data originating from agents cannot be tampered with or replayed by an attacker.

## Key Features
- **HMAC-SHA256 Signing**: Generates deterministic signatures for telemetry payloads using a shared secret key.
- **Integrity Protection**: Ensures that internal modifications to a payload (e.g., changing a process name or risk level) result in signature failure.
- **Replay Protection**:
    - **Timestamp Windowing**: Rejects any payload with a timestamp more than 60 seconds old.
    - **Nonce/Event ID Tracking**: Maintains a cache of `KNOWN_NONCES` twice-seen within the timestamp window to prevent identical events from being re-processed.
- **Versioning**: Supports versioned signature formats (e.g., `v1:hash`) for future-proof backward compatibility.

## Implementation Details
- `generate_signature()`: Uses `json.dumps(..., sort_keys=True)` to ensure a canonical representation before hashing.
- `verify_signature()`: Performs constant-time comparison using `hmac.compare_digest` to prevent timing attacks.
- Implements a primitive cleanup for `KNOWN_NONCES` to prevent memory exhaustion in the prototype.

## Security Note
In a production deployment, the `AEGIS_SECRET_KEY` should be stored in a secure Hardware Security Module (HSM) or a managed Key Vault rather than hardcoded.

## Dependencies
- `hmac`, `hashlib`: For cryptographic primitives.
- `json`: For canonical payload serialization.

## Usage
Used by the `main.py` telemetry loop to verify "Simulation" events and by the `AegisAgent` (if applicable) to sign outbound data.
