import asyncio
import sys
import os

# Ensure backend package is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.engine.policy_engine import policy_engine
from backend.engine.response_engine import ResponseEngine

async def verify_policies():
    print("--- Verifying SOAR v2 Policy Engine ---")
    
    re = ResponseEngine()
    
    # Test Case 1: High Risk brute force on a Workstation
    threat_workstation = {
        "threat_type": "brute_force",
        "confidence": 95,
        "is_anomaly": True
    }
    asset_workstation = "Workstation"
    
    verdict_1 = policy_engine.evaluate(threat_workstation, asset_workstation)
    print(f"\n[Test 1] Workstation + High Risk Brute Force:")
    print(f"Result: {verdict_1}")
    
    if verdict_1["approved"]:
        # Mock execution
        res = re.execute_action(verdict_1["action"], "192.168.1.50", "THREAT_001")
        print(f"Action Execution: {res}")

    # Test Case 2: High Risk exfiltration on a Critical DB Tier
    threat_db = {
        "threat_type": "exfiltration",
        "confidence": 98,
        "is_anomaly": True
    }
    asset_db = "Critical_DB_Tier"
    
    verdict_2 = policy_engine.evaluate(threat_db, asset_db)
    print(f"\n[Test 2] Critical DB + High Risk Exfiltration:")
    print(f"Result: {verdict_2}")
    
    if not verdict_2["approved"]:
        print(f"Safety Guard Active: Action '{verdict_2['action']}' held for {verdict_2['mode']} due to {verdict_2.get('reason')}")

if __name__ == "__main__":
    asyncio.run(verify_policies())
