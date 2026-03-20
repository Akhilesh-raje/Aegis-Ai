"""
AegisAI v4 — Security Graph Engine
Builds a temporal relationship graph of User -> Process -> Machine -> Destination.
Tracks lateral movement and attack chains.
"""

from typing import Dict, Any, List, Set
from datetime import datetime, timezone
import uuid

class GraphNode:
    def __init__(self, node_id: str, label: str, node_type: str):
        self.id = node_id
        self.label = label
        self.type = node_type # e.g., 'user', 'machine', 'process', 'ip'
        self.properties = {}

class GraphEdge:
    def __init__(self, source: str, target: str, relationship: str):
        self.source = source
        self.target = target
        self.relationship = relationship # e.g., 'logs_into', 'spawns', 'connects'
        self.timestamp = datetime.now(timezone.utc).isoformat()

class SecurityGraphEngine:
    def __init__(self):
        self.nodes: Dict[str, GraphNode] = {}
        self.edges: List[GraphEdge] = []
        self.max_edges = 1000 # Pruning limit for v4 prototype

    def add_node(self, node_id: str, label: str, node_type: str):
        if node_id not in self.nodes:
            self.nodes[node_id] = GraphNode(node_id, label, node_type)

    def add_edge(self, source: str, target: str, relationship: str):
        # Prevent self-loops
        if source == target:
            return
        self.edges.append(GraphEdge(source, target, relationship))
        if len(self.edges) > self.max_edges:
            self.edges.pop(0) # Simple FIFO pruning for proto

    def process_event(self, event: Any):
        """Extract graph relationships from an AegisEvent."""
        # 1. User -> Machine Relationship
        user_id = f"user:{event.source_identity}"
        machine_id = f"host:{event.source_node}"
        
        self.add_node(user_id, event.source_identity, "user")
        self.add_node(machine_id, event.source_node, "machine")
        
        if "LOGIN" in event.event_type:
            self.add_edge(user_id, machine_id, "logs_into")

        # 2. Process -> Network Relationship
        if "NET" in event.event_type and "remote_ip" in event.data:
            dest_id = f"ip:{event.data['remote_ip']}"
            self.add_node(dest_id, event.data['remote_ip'], "ip")
            self.add_edge(machine_id, dest_id, "connects")

        # 3. User -> Action Correlation
        if "FILE" in event.event_type or "PROCESS" in event.event_type:
             self.add_edge(user_id, machine_id, "interacts")

    def get_graph_data(self, active_threats: List[Dict[str, Any]] | None = None) -> Dict[str, Any]:
        """Returns data formatted for frontend graph visualization (D3/Vis.js)."""
        active_threats = active_threats or []
        threat_ips = {t["source_ip"]: t for t in active_threats if t.get("status") == "active"}

        nodes_out = []
        for n in self.nodes.values():
             out: Dict[str, Any] = {"id": n.id, "label": n.label, "type": n.type}
             
             if n.type == "ip" and n.label in threat_ips:
                 out["threat_score"] = 100
                 out["threat_detail"] = threat_ips[n.label]["threat_type"]
                 out["severity"] = threat_ips[n.label].get("severity", "high")
             elif "threat_score" in n.properties:
                 out["threat_score"] = n.properties["threat_score"]
                 
             nodes_out.append(out)
             
        # Add value to links to control particle speed based on relationship
        links_out = []
        for e in self.edges:
            val = 2
            if e.relationship == "c2_beacon": val = 6
            links_out.append({"source": e.source, "target": e.target, "relationship": e.relationship, "time": e.timestamp, "value": val})
            
        return {
            "nodes": nodes_out,
            "links": links_out
        }

graph_engine = SecurityGraphEngine()
