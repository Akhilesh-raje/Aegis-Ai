import asyncio
from backend.ai.decision_engine import decision_engine

def test_sentinel():
    context = {"risk_score": 90, "active_threats": 2}
    ai_output = "I have detected a critical ransomware attack. Generating response. [MITIGATION: block_ip|{\"ip\": \"203.0.113.5\"}]"
    threat = {"threat_type": "Data Exfiltration"}
    
    # We set autonomy_mode to True for this test so it auto-executes
    decision_engine.autonomy_mode = True
    
    decision = decision_engine.decide_action(context, ai_output, threat)
    print("Action:", decision["action"])
    print("Auto-Executed:", decision["auto_executed"])
    print("Mitigation Result:", decision.get("mitigation_result"))
    print("Evidence:")
    for e in decision["evidence"]:
        print(f" - {e}")

if __name__ == "__main__":
    test_sentinel()
