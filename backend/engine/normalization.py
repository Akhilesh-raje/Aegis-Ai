"""
AegisAI v3 — Event Normalization Layer
Maps raw system telemetry from various sources into a unified AegisEvent schema.
Upgraded for AegisAI v4 Telemetry Hardening (mTLS & Signing).
"""

from typing import Dict, Any, List
from datetime import datetime, timezone
import uuid

class AegisEvent:
    def __init__(
        self,
        event_type: str,
        source_node: str,
        source_identity: str,
        data: Dict[str, Any],
        severity: int = 0,
        role: str = "user",
        session_id: str = "anon",
        privilege_level: int = 1,
        signature: str = "unsigned",
        is_simulation: bool = False,
        timestamp: float = 0.0
    ):
        self.id = str(uuid.uuid4())
        self.timestamp = timestamp if timestamp > 0 else datetime.now(timezone.utc).timestamp()
        self.event_type = event_type
        self.source_node = source_node
        self.source_identity = source_identity
        self.data = data
        self.severity = severity
        self.role = role
        self.session_id = session_id
        self.privilege_level = privilege_level
        self.signature = signature
        self.is_simulation = is_simulation

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "timestamp": self.timestamp,
            "event_type": self.event_type,
            "source_node": self.source_node,
            "source_identity": self.source_identity,
            "data": self.data,
            "severity": self.severity,
            "signature": self.signature,
            "is_simulation": self.is_simulation,
            "identity": {
                "role": self.role,
                "session_id": self.session_id,
                "privilege_level": self.privilege_level
            }
        }

class EventNormalizer:
    @staticmethod
    def normalize_telemetry(raw_data: Dict[str, Any], machine_id: str = "local-node") -> List[AegisEvent]:
        normalized_events = []
        
        # Extract signature and timestamp if provided in the raw data (v4)
        signature = raw_data.get("_signature", "unsigned")
        timestamp = raw_data.get("_timestamp", 0.0)
        
        # Extract real identity context if available (v5 Real Telemetry)
        active_users = raw_data.get("users", [])
        primary_user = active_users[0]["name"] if active_users else "System"
        
        # 1. Process Resource Metrics
        if "system" in raw_data:
            sys = raw_data["system"]
            normalized_events.append(AegisEvent(
                event_type="METRIC_CPU_USAGE",
                source_node=machine_id,
                source_identity=primary_user,
                data={"usage": sys.get("cpu_percent", 0)},
                severity=1 if sys.get("cpu_percent", 0) > 80 else 0,
                role="privileged" if primary_user in ["root", "admin", "System"] else "user",
                session_id=f"os-{primary_user}",
                signature=signature,
                timestamp=timestamp
            ))
            normalized_events.append(AegisEvent(
                event_type="METRIC_MEM_USAGE",
                source_node=machine_id,
                source_identity=primary_user,
                data={"usage": sys.get("memory_percent", 0)},
                severity=1 if sys.get("memory_percent", 0) > 90 else 0,
                role="privileged" if primary_user in ["root", "admin", "System"] else "user",
                session_id=f"os-{primary_user}",
                signature=signature,
                timestamp=timestamp
            ))

        # 2. Process Network Connections
        if "connections" in raw_data:
            connections = raw_data["connections"]
            for conn in connections:
                # Map PID to username if possible
                proc_user = primary_user
                normalized_events.append(AegisEvent(
                    event_type="NET_CONNECTION",
                    source_node=machine_id,
                    source_identity=proc_user,
                    data=conn,
                    severity=1 if conn.get("status") == "LISTEN" else 0,
                    role="user",
                    session_id=f"pid-{conn.get('pid', '0')}",
                    signature=signature,
                    timestamp=timestamp
                ))

        # 3. Process Security Signals
        if "observations" in raw_data:
            observations = raw_data["observations"]
            for obs in observations:
                normalized_events.append(AegisEvent(
                    event_type="SECURITY_SIGNAL",
                    source_node=machine_id,
                    source_identity=obs.get("username", primary_user),
                    data=obs,
                    severity=2 if obs.get("confidence", 0) > 0.7 else 1,
                    role=obs.get("role", "user"),
                    session_id=obs.get("session_id", "anon"),
                    signature=signature,
                    is_simulation=raw_data.get("is_simulation", False),
                    timestamp=timestamp
                ))

        return normalized_events

    @staticmethod
    def normalize_generic_event(raw_event: Dict[str, Any], machine_id: str = "local-node") -> AegisEvent:
        """Normalizes a raw log event (from generator) into an AegisEvent."""
        return AegisEvent(
            event_type=raw_event.get("event_type", "GENERIC_LOG"),
            source_node=raw_event.get("agent_id", machine_id),
            source_identity=raw_event.get("user", "System"),
            data={k: v for k, v in raw_event.items() if k not in ["_signature", "_timestamp", "id"]},
            severity=0 if raw_event.get("success", True) else 1,
            role=raw_event.get("role", "user"),
            session_id=raw_event.get("session_id", "anon"),
            privilege_level=raw_event.get("privilege_level", 1),
            signature=raw_event.get("_signature", "unsigned"),
            is_simulation=raw_event.get("is_simulation", False),
            timestamp=raw_event.get("_timestamp", 0.0)
        )
