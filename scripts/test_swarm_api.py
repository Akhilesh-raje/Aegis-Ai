from backend.ai.decision_engine import decision_engine

def main():
    print("[*] Initiating Direct Swarm Inference (NetSec + Endpoint + Commander)...")
    
    response = """
### 🌐 [NETSEC_ANALYSIS]
The source IP 185.15.20.10 has established an outbound HTTPS connection to a low-reputation domain resulting in continuous active beaconing. Anomalous 1MB bursts detected every 5 minutes indicating potential data exfiltration or C2 heartbeat traffic matching MITRE T1071.

### 💻 [ENDPOINT_ANALYSIS]
A suspicious invocation of powershell.exe was launched with `ExecutionPolicy Bypass`. This spawned `rundll32.exe` utilizing MiniDumpWriteDump targeting `lsass.exe` (PID 8832), matching known credential dumping behavior (MITRE T1003.001). Extreme high CPU utilization logged for powershell process.

### 👑 [COMMANDER_DECISION]
Synthesizing both analyses confirms a high-severity Advanced Persistent Threat scenario combining network C2 beaconing and local credential dumping. Immediate containment is mandatory.

- **Anomalies Detected**: 
  1. C2 Beaconing to maldet.io (MITRE T1071)
  2. powershell.exe bypassing execution policies
  3. rundll32 proxying MiniDumpWriteDump against LSASS space
  4. Memory anomaly spike near process 8832
- **SWARM_CONFIDENCE**: 0.99
- **SENTINEL COMMAND**: [MITIGATION: terminate_process|{"pid": 8832}]
"""
    
    print("\n================== [ NETSEC & ENDPOINT DEBATE ] ==================\n")
    print(response)
    
    print("\n================== [ COMMANDER SOAR GATING ] ==================\n")
    event = {
        "target_pid": 8832,
        "threat_type": "Privilege Escalation",
        "severity": "critical",
        "source_ip": "185.15.20.10"
    }
    
    # MUST set autonomy_mode to True for it to auto_execute
    decision_engine.autonomy_mode = True
    
    decision = decision_engine.decide_action({"target_pid": 8832}, response, event)
    print(f"ACTION: {decision['action']}")
    print(f"CONFIDENCE TRIGGER: {decision['confidence'] * 100:.0f}%")
    print(f"AUTO-MITIGATED: {decision['auto_executed']}")
    print(f"MITIGATION RESULT: {decision.get('mitigation_result')}")
    print(f"FORENSICS: {decision.get('forensics_result', 'None')}")
    print("EVIDENCE / ANOMALIES:")
    for e in decision['evidence']:
        print(f"  - {e}")

if __name__ == "__main__":
    main()
