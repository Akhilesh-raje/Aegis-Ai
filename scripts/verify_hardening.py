import asyncio
import sys
import os
import time

# Ensure backend package is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.engine.crypto import generate_signature, verify_signature

async def verify_crypto():
    print("--- Verifying AegisAI v4 Telemetry Hardening ---")
    
    payload = {
        "event_type": "login_attempt",
        "user": "alice",
        "source_ip": "10.0.1.5"
    }
    
    timestamp = time.time()
    
    # 1. Generate Signature
    sig = generate_signature(payload, timestamp)
    print(f"\n[Step 1] Generated Signature: {sig}")
    
    # 2. Verify Valid Signature
    is_valid = verify_signature(payload, timestamp, sig)
    print(f"[Step 2] Verification result (Valid): {is_valid}")
    assert is_valid == True
    
    # 3. Verify Tampered Payload
    tampered_payload = payload.copy()
    tampered_payload["user"] = "attacker"
    is_valid_tampered = verify_signature(tampered_payload, timestamp, sig)
    print(f"[Step 3] Verification result (Tampered Payload): {is_valid_tampered}")
    assert is_valid_tampered == False
    
    # 4. Verify Replay Attack (Simulated Clock Skew)
    old_timestamp = timestamp - 120 # 2 minutes ago
    is_valid_replay = verify_signature(payload, old_timestamp, sig)
    print(f"[Step 4] Verification result (Replay Attack): {is_valid_replay}")
    assert is_valid_replay == False

    print("\n✅ Telemetry Hardening Verification COMPLETE.")

if __name__ == "__main__":
    asyncio.run(verify_crypto())
