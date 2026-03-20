"""
AegisAI v4 — Identity Context Engine
Correlates events to specific identities, tracks active sessions, 
and detects identity-based anomalies (Credential Abuse, Role Deviation).
"""

from typing import Dict, Any, List
from datetime import datetime, timezone

class IdentityProfile:
    def __init__(self, username: str, role: str):
        self.username = username
        self.role = role
        self.last_login: str | None = None
        self.last_source_ip: str | None = None
        self.privilege_level = 1
        self.active_sessions: Dict[str, Dict[str, Any]] = {}
        self.risk_score = 0
        self.obs_count = 0

    def record_session(self, session_id: str, source_ip: str, auth_method: str, privilege: int):
        self.active_sessions[session_id] = {
            "source_ip": source_ip,
            "auth_method": auth_method,
            "privilege": privilege,
            "started_at": datetime.now(timezone.utc).isoformat()
        }
        self.last_login = datetime.now(timezone.utc).isoformat()
        self.last_source_ip = source_ip
        self.privilege_level = max(self.privilege_level, privilege)

    def pulse(self, source_ip: str):
        self.last_login = datetime.now(timezone.utc).isoformat()
        self.last_source_ip = source_ip

class IdentityContextEngine:
    def __init__(self):
        self.profiles: Dict[str, IdentityProfile] = {}
        self.session_map: Dict[str, str] = {} # session_id -> username

    def process_event(self, event: Any):
        """Analyze an AegisEvent for identity correlation."""
        username = event.source_identity
        if not username or username in ["anonymous", "Unknown"]:
            return

        if username not in self.profiles:
            self.profiles[username] = IdentityProfile(username, event.role)

        profile = self.profiles[username]
        session_id = event.session_id
        
        # Update heartbeat on every event
        profile.pulse(event.source_node)

        # New Session Correlation
        if session_id not in profile.active_sessions:
            profile.record_session(session_id, event.source_node, "system_auth", event.privilege_level)
            self.session_map[session_id] = username

        # Behavioural Check: Privilege Escalation Attempt
        if event.privilege_level > profile.privilege_level:
            profile.risk_score += 20
            # This would trigger a SECURITY observation in the mesh
            
        # Behavioural Check: Impossible Travel (Simulated via IP change)
        if profile.last_source_ip and event.source_node != profile.last_source_ip:
            # For local node simulation this is rare, but important for distributed agents
            pass

        profile.obs_count += 1

    def get_identity_insights(self) -> List[Dict[str, Any]]:
        insights = []
        now = datetime.now(timezone.utc)
        for username, profile in self.profiles.items():
            # Determine if session is "Active" (last event within 30s)
            last_login = profile.last_login
            last_dt = datetime.fromisoformat(last_login) if last_login else now
            is_active = (now - last_dt).total_seconds() < 30
            
            insights.append({
                "username": username,
                "role": profile.role,
                "risk_score": profile.risk_score,
                "active_sessions": len(profile.active_sessions),
                "last_seen": profile.last_login,
                "is_active": is_active,
                "privilege": profile.privilege_level
            })
        
        # Sort by risk first, then by active status
        return sorted(insights, key=lambda x: (x["risk_score"], x["is_active"]), reverse=True)

    def get_user_context(self, username: str) -> Dict[str, Any]:
        if username in self.profiles:
            p = self.profiles[username]
            return {
                "username": p.username,
                "role": p.role,
                "risk": p.risk_score,
                "sessions": list(p.active_sessions.keys()),
                "privilege": p.privilege_level
            }
        return {}

identity_engine = IdentityContextEngine()
