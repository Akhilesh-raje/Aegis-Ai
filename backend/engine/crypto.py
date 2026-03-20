"""
AegisAI v4 — Telemetry Security Utilities
Provides cryptographic signing and verification for telemetry streams.
Upgraded with Audit-Grade Hardening (Nonces, Event IDs, Versioning).
"""

import hmac
import hashlib
import json
import time
import uuid
from typing import Dict, Any, Set

# In a real enterprise deployment, this would be managed via an HSM or Key Vault.
AEGIS_SECRET_KEY = b"aegis_v4_vanguard_secure_telemetry_key_2026"

# Cache for recently seen nonces to prevent replay within the timestamp window
# In a distributed system, this would be a Redis/shared cache
KNOWN_NONCES: Set[str] = set()

def generate_signature(payload: Dict[str, Any], timestamp: float, secret: bytes = AEGIS_SECRET_KEY, version: str = "v1") -> str:
    """
    Generates an HMAC-SHA256 signature for a telemetry payload.
    Ensures deterministic ordering of JSON keys.
    """
    # Create a canonical string representation of the data + metadata
    payload_str = json.dumps(payload, sort_keys=True)
    message = f"{version}|{payload_str}|{timestamp}".encode('utf-8')
    
    signature = hmac.new(secret, message, hashlib.sha256).hexdigest()
    return f"{version}:{signature}"

def verify_signature(payload: Dict[str, Any], timestamp: float, signature: str, secret: bytes = AEGIS_SECRET_KEY) -> bool:
    """
    Verifies the HMAC-SHA256 signature of a payload.
    Includes replay protection via timestamp window and nonce tracking.
    """
    try:
        if ":" not in signature:
            return False
            
        version, sig_hash = signature.split(":", 1)
        
        # 1. Replay Protection: Timestamp Window (60s)
        current_time = time.time()
        if abs(current_time - timestamp) > 60:
            return False 

        # 2. Replay Protection: Nonce/Event ID Tracking
        # The payload must contain a 'nonce' or 'id'
        nonce = payload.get("nonce") or payload.get("id")
        if not nonce:
            return False
            
        if nonce in KNOWN_NONCES:
            return False # Replayed event
            
        # 3. Cryptographic Verification
        expected_sig_full = generate_signature(payload, timestamp, secret, version)
        expected_hash = expected_sig_full.split(":", 1)[1]
        
        if hmac.compare_digest(expected_hash, sig_hash):
            # Mark nonce as seen (with simple cleanup logic for prototype)
            KNOWN_NONCES.add(nonce)
            if len(KNOWN_NONCES) > 10000:
                KNOWN_NONCES.clear() # Primitive cleanup
            return True
            
        return False
    except Exception:
        return False
