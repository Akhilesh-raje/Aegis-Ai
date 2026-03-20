"""
AegisAI v3 — Fleet Management Layer
Tracks and manages the health state of all registered AegisAgents in the network.
"""

from typing import Dict, Any, List
from datetime import datetime, timezone

class FleetNode:
    def __init__(self, node_id: str, hostname: str, asset_type: str = "Workstation"):
        self.node_id = node_id
        self.hostname = hostname
        self.asset_type = asset_type
        self.last_seen = datetime.now(timezone.utc)
        self.status = "nominal"
        self.risk_level = "low"
        self.risk_score = 0
        self.is_simulation_active = False
        self.metrics = {"cpu": 0, "mem": 0}

    def to_dict(self):
        return {
            "node_id": self.node_id,
            "hostname": self.hostname,
            "asset_type": self.asset_type,
            "last_seen": self.last_seen.isoformat(),
            "status": self.status,
            "risk_level": self.risk_level,
            "risk_score": self.risk_score,
            "is_simulation_active": self.is_simulation_active,
            "metrics": self.metrics
        }

class FleetManager:
    def __init__(self):
        self.nodes: Dict[str, FleetNode] = {}
        # Initial registration for demo/local node
        self.register_node("local-node", "SOC-Command-Primary", "Command_Console")

    def register_node(self, node_id: str, hostname: str, asset_type: str = "Workstation"):
        if node_id not in self.nodes:
            self.nodes[node_id] = FleetNode(node_id, hostname, asset_type)

    def update_node(self, node_id: str, risk_score: int, metrics: Dict[str, Any]):
        if node_id in self.nodes:
            node = self.nodes[node_id]
            node.last_seen = datetime.now(timezone.utc)
            node.risk_score = risk_score
            node.metrics = metrics
            
            # Derived status
            if risk_score > 70:
                node.status = "critical"
                node.risk_level = "critical"
            elif risk_score > 40:
                node.status = "warning"
                node.risk_level = "medium"
            else:
                node.status = "nominal"
                node.risk_level = "low"

    def get_fleet_summary(self) -> List[Dict[str, Any]]:
        return [node.to_dict() for node in self.nodes.values()]

fleet_manager = FleetManager()
