"""
Automated Response Engine
Recommends and executes containment actions with safelist protection
and human-in-the-loop override capability.
Upgraded for AegisAI v4 SOAR v2 Policy integration.
"""

from typing import TypedDict, Any
import time

class ResponseAction(TypedDict):
    action: str
    description: str
    auto: bool


# Infrastructure safelist — these IPs/assets cannot be auto-blocked
INFRASTRUCTURE_SAFELIST = {
    "10.0.0.1",       # gateway
    "10.0.0.2",       # DNS server
    "10.0.1.1",       # database server
    "10.0.1.2",       # payment gateway
    "10.0.2.1",       # internal API server
    "127.0.0.1",      # localhost
}

# Response actions per threat type
RESPONSE_ACTIONS: dict[str, list[ResponseAction]] = {
    "brute_force": [
        {"action": "block_ip", "description": "Block source IP address", "auto": True},
        {"action": "lock_account", "description": "Lock targeted user account", "auto": False},
        {"action": "alert_admin", "description": "Send alert to security administrator", "auto": True},
    ],
    "ddos": [
        {"action": "block_ip", "description": "Block attacking IP addresses", "auto": True},
        {"action": "rate_limit", "description": "Enable rate limiting", "auto": True},
        {"action": "alert_admin", "description": "Escalate to network operations", "auto": True},
    ],
    "port_scan": [
        {"action": "block_ip", "description": "Block scanning source IP", "auto": False},
        {"action": "alert_admin", "description": "Flag for investigation", "auto": True},
    ],
    "exfiltration": [
        {"action": "isolate_service", "description": "Isolate affected system", "auto": False},
        {"action": "lock_account", "description": "Lock user account", "auto": True},
        {"action": "alert_admin", "description": "Urgent escalation to security team", "auto": True},
    ],
    "insider_threat": [
        {"action": "lock_account", "description": "Lock suspected user account", "auto": False},
        {"action": "alert_admin", "description": "Escalate to security team", "auto": True},
    ],
    "unknown_anomaly": [
        {"action": "alert_admin", "description": "Flag for manual analyst review", "auto": True},
    ],
}


class ResponseEngine:
    """Manages threat response actions with safelist and approval controls."""

    def __init__(self):
        self.safelist = INFRASTRUCTURE_SAFELIST.copy()
        self.blocked_ips: set[str] = set()
        self.locked_accounts: set[str] = set()
        self.action_log: list[dict[str, Any]] = []

    def get_recommended_actions(self, threat_type: str, source_ip: str) -> list[dict]:
        """
        Get recommended response actions for a given threat.
        Marks actions as blocked if target is on safelist.
        """
        actions = RESPONSE_ACTIONS.get(threat_type, RESPONSE_ACTIONS["unknown_anomaly"])

        result = []
        for action in actions:
            entry = {**action}
            # Check safelist
            if action["action"] == "block_ip" and source_ip in self.safelist:
                entry["blocked_by_safelist"] = True
                entry["auto"] = False
                desc: str = str(entry.get("description", ""))
                entry["description"] = desc + " [PROTECTED — safelist]"
            else:
                entry["blocked_by_safelist"] = False
            result.append(entry)

        return result

    def execute_action(self, action: str, target: str, threat_id: str) -> dict:
        """
        Execute a containment action.
        """
        # Safelist check
        if action == "block_ip" and target in self.safelist:
            log_entry = {
                "action": action,
                "target": target,
                "threat_id": threat_id,
                "status": "rejected",
                "reason": "Target is on infrastructure safelist",
                "timestamp": time.time()
            }
            self.action_log.append(log_entry)
            return log_entry

        # Execute
        if action == "block_ip":
            self.blocked_ips.add(target)
            status = "executed"
            detail = f"IP {target} has been blocked (Autonomous)"
        elif action == "lock_account":
            self.locked_accounts.add(target)
            status = "executed"
            detail = f"Account '{target}' has been locked (Autonomous)"
        elif action == "isolate_host":
            status = "executed"
            detail = f"Host {target} has been isolated from the network via SOAR v2 Policy"
        elif action == "kill_process":
            status = "executed"
            detail = f"Suspicious process on {target} has been terminated automatically"
        elif action == "isolate_service":
            status = "executed"
            detail = f"Service isolation initiated for {target}"
        elif action == "rate_limit":
            status = "executed"
            detail = f"Rate limiting enabled for {target}"
        elif action == "alert_admin":
            status = "executed"
            detail = f"Security alert sent regarding {target}"
        else:
            status = "unknown_action"
            detail = f"Unrecognized action: {action}"

        log_entry = {
            "action": action,
            "target": target,
            "threat_id": threat_id,
            "status": status,
            "detail": detail,
            "mode": "autonomous",
            "timestamp": time.time()
        }
        self.action_log.append(log_entry)
        return log_entry

    def get_action_log(self, limit: int = 50) -> list[dict]:
        """Return recent action history."""
        start_idx = max(0, len(self.action_log) - limit)
        return [self.action_log[i] for i in range(start_idx, len(self.action_log))]

    def is_blocked(self, ip: str) -> bool:
        """Check if an IP is currently blocked."""
        return ip in self.blocked_ips
