"""
AegisAI v3 — Rules Engine (Heuristics)
Fast signature-based detection for common attack patterns and misconfigurations.
"""

from typing import List, Dict, Any, Optional
from backend.engine.normalization import AegisEvent
import time

class RulesEngine:
    def __init__(self):
        # State tracking for frequency-based rules
        self.node_counters: Dict[str, Dict[str, List[float]]] = {}
        
    def analyze(self, event: AegisEvent) -> Optional[Dict[str, Any]]:
        """Run heuristic rules against a normalized event."""
        
        # 1. Management Port Exposure Rule
        if event.event_type == "NET_CONNECTION_ESTABLISHED":
            port = event.data.get("remote_port")
            if port in [22, 3389, 445, 5900]:
                return {
                    "rule_id": "RULE_MGMT_PORT_EXPOSURE",
                    "title": f"Critical Port Access: {port}",
                    "severity": "high",
                    "description": f"Management port {port} is being accessed from an external source.",
                    "mitre_tactic": "Initial Access"
                }

        # 2. Connection Flood Rule (Basic Threshold)
        if event.event_type == "NET_CONNECTION_ESTABLISHED":
            node = event.source_node
            now = time.time()
            
            if node not in self.node_counters:
                self.node_counters[node] = {"connections": []}
            
            # Keep only last 1 minute of connections
            conns = self.node_counters[node]["connections"]
            conns.append(now)
            self.node_counters[node]["connections"] = [t for t in conns if now - t < 60]
            
            if len(self.node_counters[node]["connections"]) > 50:
                return {
                    "rule_id": "RULE_CONN_FLOOD",
                    "title": "Network Connection Flood",
                    "severity": "medium",
                    "description": "High frequency of outbound connections detected in a short interval.",
                    "mitre_tactic": "Exfiltration / Discovery"
                }

        # 3. Resource Saturation Rule
        if event.event_type == "METRIC_CPU_USAGE":
            usage = event.data.get("usage_percent", 0)
            if usage > 95:
                return {
                    "rule_id": "RULE_CPU_SATURATION",
                    "title": "Compute Exhaustion",
                    "severity": "medium",
                    "description": f"CPU usage on {event.source_node} has reached {usage}%. possible DoS or cryptomining.",
                    "mitre_tactic": "Impact"
                }

        return None

# Global Instance
rules_engine = RulesEngine()
