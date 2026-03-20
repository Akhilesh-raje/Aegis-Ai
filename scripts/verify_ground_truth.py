import sys
import os
import json
import asyncio
from datetime import datetime

# Ensure backend package is importable
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.engine.telemetry import TelemetryEngine
from backend.engine.insight_engine import InsightEngine
from backend.engine.risk_scorer import RiskScorer
from backend.engine.rules_engine import rules_engine
from backend.engine.threat_intel_engine import intel_engine
from backend.engine.identity_engine import identity_engine
from backend.engine.graph_engine import graph_engine
from backend.engine.fleet_manager import fleet_manager
from backend.storage.database import Database

def test_ground_truth():
    print("--- AegisAI Ground Truth Audit ---")
    
    db = Database()
    telemetry = TelemetryEngine()
    risk_scorer = RiskScorer()
    insight_engine = InsightEngine(db, telemetry, risk_scorer, rules_engine, intel_engine)
    
    # 1. Fleet Audit
    fleet = fleet_manager.get_fleet_summary()
    print(f"\n[Fleet] Registered Nodes: {len(fleet)}")
    for node in fleet:
        print(f" - {node['node_id']} ({node['hostname']}) Status: {node['status']}")
    
    # 2. Identity Audit
    identities = identity_engine.get_identity_insights()
    print(f"\n[Identity] Real Principals Detected: {len(identities)}")
    for data in identities:
         print(f" - Principal: {data['username']}, Risk: {data['risk_score']}, Role: {data['role']}, Active: {data['is_active']}")

    # 3. Security Graph Audit
    graph = graph_engine.get_graph_data()
    print(f"\n[Graph] Infrastructure Purity: Nodes: {len(graph['nodes'])}, Edges: {len(graph['links'])}")
    for node in graph['nodes']:
        if node['label'] in ['AEGIS_CORE', 'SVC_ADMIN', 'DB_PROD_MAIN']:
            print(f" ERROR: Mock node {node['label']} still exists!")
    
    # 4. Exposure Analytics Audit
    insights = insight_engine.get_security_signals()
    exposure = next((o for o in insights['observations'] if o['category'] == 'SERVICE_EXPOSURE'), None)
    if exposure:
        print(f"\n[Exposure] Active Surface Detected: {len(exposure['raw_evidence']['open_ports'])} ports")
        print(f" - Services: {exposure['raw_evidence']['exposed_services']}")
    else:
        print("\n[Exposure] No public surface detected (Normal).")

    # 5. Risk Verdict
    print(f"\n[Verdict] System Health Score: {insights['score']['total']}")
    print(f" - Verdict: {insights['verdict']}")
    print(f" - Top Issues: {insights['top_issues']}")

if __name__ == "__main__":
    test_ground_truth()
