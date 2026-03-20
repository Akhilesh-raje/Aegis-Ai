"""
AegisAI Log Simulator
Generates realistic security events — both normal activity and attack patterns.
Upgraded with Audit-Grade Telemetry Hardening (v4.1) and Simulation Support.
"""

import random
import time
import uuid
import secrets
from datetime import datetime, timezone
from typing import Any
from backend.engine.crypto import generate_signature  # type: ignore

# Realistic data pools
# Realistic data pools
NORMAL_USERS = [
    "alice", "bob", "carol", "dave", "eve", "frank", "grace", "henry", 
    "isaac", "judy", "kevin", "laura", "mike", "nina", "oscar", "peggy"
]
ADMIN_USERS = ["admin_root", "sys_sec_01", "infra_lead"]
USER_ROLES = {
    "alice": "Security Analyst",
    "bob": "Security Analyst",
    "carol": "DevOps Engineer",
    "dave": "Backend Developer",
    "eve": "Frontend Developer",
    "frank": "System Administrator",
    "grace": "Data Scientist",
    "henry": "Compliance Officer",
    "admin_root": "Principal Architect",
    "sys_sec_01": "Security Lead",
    "infra_lead": "Infrastructure Lead"
}
NORMAL_IPS = [f"10.0.{random.randint(1,5)}.{random.randint(10,200)}" for _ in range(20)]
SUSPICIOUS_IPS = [
    "185.23.44.12", "91.134.200.87", "45.227.255.99",
    "103.75.190.11", "178.128.91.45", "194.26.29.103",
]
PORTS = [22, 80, 443, 8080, 3306, 5432, 8443, 27017]
GEO_NORMAL = ["New York, US", "London, UK", "Mumbai, IN", "Berlin, DE", "Tokyo, JP"]
GEO_SUSPICIOUS = ["Moscow, RU", "Pyongyang, KP", "Unknown", "Tor Exit Node", "Lagos, NG"]

EVENT_TYPES = ["login_attempt", "network_request", "file_access", "process_start", "api_call"]


def _make_event(
    event_type: str,
    source_ip: str,
    user: str,
    success: bool,
    port: int,
    payload_size: int,
    geo: str,
    role: str = "user",
    session_id: str = "",
    privilege_level: int = 1,
    auth_method: str = "password",
    machine_id: str = "local-node",
    is_simulation: bool = False,
    data_override: dict[str, Any] | None = None
) -> dict:
    """Create a single event record with identity context and cryptographic signature."""
    timestamp = time.time()
    
    # Audit-Grade Hardening: Added Nonce and Agent ID
    payload: dict[str, Any] = {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.fromtimestamp(timestamp, tz=timezone.utc).isoformat(),
        "nonce": secrets.token_hex(16),
        "agent_id": machine_id,
        "event_type": event_type,
        "source_ip": source_ip,
        "user": user,
        "role": role,
        "session_id": session_id or secrets.token_hex(4),
        "privilege_level": privilege_level,
        "auth_method": auth_method,
        "success": success,
        "port": port,
        "payload_size": payload_size,
        "geo": geo,
        "is_simulation": is_simulation,
    }
    
    # Merge optional data overrides (e.g., for simulation engine)
    if data_override:
        payload.update(data_override)
    
    # Generate HMAC signature
    signature = generate_signature(payload, timestamp)
    
    # Add metadata for transmission
    payload["_signature"] = signature
    payload["_timestamp"] = timestamp
    
    return payload


def generate_normal_event() -> dict:
    """Generate a single normal system event with identity."""
    user = random.choice(NORMAL_USERS)
    role = USER_ROLES.get(user, "User")
    return _make_event(
        event_type=random.choice(EVENT_TYPES),
        source_ip=random.choice(NORMAL_IPS),
        user=user,
        role=role,
        session_id=f"sess-{random.randint(1000, 9999)}",
        privilege_level=random.randint(1, 2),
        auth_method=random.choice(["password", "token", "sso"]),
        success=random.random() < 0.95,
        port=random.choice([80, 443, 8080]),
        payload_size=random.randint(64, 2048),
        geo=random.choice(GEO_NORMAL),
    )


def generate_normal_batch(count: int = 20) -> list[dict]:
    """Generate a batch of normal events."""
    return [generate_normal_event() for _ in range(count)]


# ---------------------------------------------------------------------------
# Attack generators
# ---------------------------------------------------------------------------

def generate_brute_force_events(count: int = 50) -> list[dict]:
    """Simulate a brute-force login attack targeting an admin role."""
    attacker_ip = random.choice(SUSPICIOUS_IPS)
    geo = random.choice(GEO_SUSPICIOUS)
    target_user = random.choice(ADMIN_USERS)
    events = []
    for i in range(count):
        events.append(_make_event(
            event_type="login_attempt",
            source_ip=attacker_ip,
            user=target_user,
            role="admin",
            session_id=f"bf-{secrets.token_hex(3)}",
            privilege_level=5,
            auth_method="password",
            success=(i == count - 1 and random.random() < 0.1),
            port=22,
            payload_size=random.randint(128, 512),
            geo=geo,
        ))
    return events


def generate_ddos_events(count: int = 80) -> list[dict]:
    """Simulate a volumetric DDoS attack (Anonymous)."""
    attacker_ips = random.sample(SUSPICIOUS_IPS, min(4, len(SUSPICIOUS_IPS)))
    events = []
    for _ in range(count):
        events.append(_make_event(
            event_type="network_request",
            source_ip=random.choice(attacker_ips),
            user="anonymous",
            role="guest",
            session_id="none",
            privilege_level=0,
            auth_method="none",
            success=True,
            port=random.choice([80, 443]),
            payload_size=random.randint(4096, 65536),
            geo=random.choice(GEO_SUSPICIOUS),
        ))
    return events


def generate_port_scan_events(count: int = 40) -> list[dict]:
    """Simulate port scanning activity (Anonymous)."""
    attacker_ip = random.choice(SUSPICIOUS_IPS)
    events = []
    scanned_ports: list[int] = random.sample(range(1, 65535), min(count, 100))
    for port in scanned_ports:
        events.append(_make_event(
            event_type="network_request",
            source_ip=attacker_ip,
            user="anonymous",
            role="guest",
            session_id="none",
            privilege_level=0,
            auth_method="none",
            success=random.random() < 0.3,
            port=port,
            payload_size=random.randint(40, 128),
            geo=random.choice(GEO_SUSPICIOUS),
        ))
    return events


def generate_exfiltration_events(count: int = 30) -> list[dict]:
    """Simulate data exfiltration using a compromised user session."""
    insider_ip = random.choice(NORMAL_IPS)
    user = random.choice(NORMAL_USERS)
    session_id = f"sess-{random.randint(1000, 9999)}"
    events = []
    for _ in range(count):
        events.append(_make_event(
            event_type="file_access",
            source_ip=insider_ip,
            user=user,
            role="user",
            session_id=session_id,
            privilege_level=2,
            auth_method="mfa",
            success=True,
            port=443,
            payload_size=random.randint(50000, 500000),
            geo=random.choice(GEO_NORMAL),
        ))
    return events


# Map attack types to their generators
ATTACK_GENERATORS = {
    "brute_force": generate_brute_force_events,
    "ddos": generate_ddos_events,
    "port_scan": generate_port_scan_events,
    "exfiltration": generate_exfiltration_events,
}
