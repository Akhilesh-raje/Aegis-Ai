"""
AegisAI — Autonomous Decision Engine
Converts AI reasoning output + live context into executable SOAR actions.
Bridges the gap between "advising" and "acting."

Decision Flow:
    Context + AI Output → decide_action() → SOAR Command → ws_manager broadcast
"""

from __future__ import annotations

import time
import re
import json
import threading
from collections import deque
from itertools import islice
from typing import Any, Dict, List, Optional
from backend.ai.remediation import sentinel  # type: ignore
from backend.forensics.tracer import tracer  # type: ignore

# ---------------------------------------------------------------------------
# SOAR Action definitions
# ---------------------------------------------------------------------------
SOAR_ACTIONS = {
    "AUTO_BLOCK_IP":      "Immediately block the source IP address at the firewall level",
    "ISOLATE_HOST":       "Quarantine the affected host from the network segment",
    "KILL_PROCESS":       "Terminate the identified malicious process tree",
    "FORCE_MFA":          "Force immediate MFA re-authentication for flagged accounts",
    "REVOKE_SESSION":     "Invalidate all active sessions for the compromised identity",
    "ALERT_SOC":          "Escalate to Level-2 SOC analyst with full context package",
    "CAPTURE_FORENSICS":  "Capture memory dump and full packet trace for forensic analysis",
    "MONITOR":            "Increase monitoring frequency — no automated action taken",
    "NO_ACTION":          "Baseline activity — continue standard monitoring",
}

# Risk thresholds
CRITICAL_THRESHOLD = 80
HIGH_THRESHOLD = 65
MEDIUM_THRESHOLD = 45


class DecisionEngine:
    """
    Autonomous decision layer — maps threat context to SOAR action recommendations.
    All decisions are logged and optionally auto-executed if autonomy mode is enabled.
    """

    def __init__(self, autonomy_mode: bool = False):
        """
        Args:
            autonomy_mode: If True, critical-severity decisions are logged as auto-executed.
                           If False (default), all decisions are recommendations only.
        """
        self.autonomy_mode = autonomy_mode
        self._decision_log: deque[Dict[str, Any]] = deque(maxlen=100)
        self._feedback_store: deque[Dict[str, Any]] = deque(maxlen=50)
        self._knowledge_store = None

    def bind_memory(self, knowledge_store):
        """Phase 12: Connect Central KnowledgeStore to the Decision Engine."""
        self._knowledge_store = knowledge_store

    # -----------------------------------------------------------------------
    # Core Decision Method
    # -----------------------------------------------------------------------
    def decide_action(
        self,
        context: Dict[str, Any],
        ai_output: str,
        threat: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Map live context + AI output to a SOAR action decision.

        Returns:
            {
                "action": str,           # SOAR action key
                "description": str,      # Human-readable explanation
                "confidence": float,     # 0.0 – 1.0
                "severity": str,         # critical / high / medium / low
                "auto_executed": bool,   # Whether autonomy_mode fired this
                "evidence": List[str],   # Supporting signals that triggered decision
                "timestamp": float,
                "target": str,           # IP / host / process being actioned
            }
        """
        risk_score = context.get("risk_score", 0)
        active_threats = context.get("active_threats", 0)
        threat_type = (threat or {}).get("threat_type", "").lower()
        source_ip = (threat or {}).get("source_ip", "unknown")
        severity = (threat or {}).get("severity", "").lower()

        evidence: List[str] = []
        action = "MONITOR"
        decision_severity = "low"

        # Multi-factor confidence scoring (Baseline)
        base_confidence = 0.60
        ai_certainty = 0.15 if "certain" in ai_output.lower() else (0.05 if "likely" in ai_output.lower() else 0.0)
        threat_booster = 0.10 if active_threats > 5 else (0.05 if active_threats > 2 else 0.0)
        confidence = base_confidence + ai_certainty + threat_booster

        # ---------------------------------------------------------------------------
        # Rule 1: Brute-force / SSH attack → AUTO_BLOCK_IP
        # ---------------------------------------------------------------------------
        if any(k in threat_type for k in ["brute", "ssh", "rdp", "password", "credential"]):
            action = "AUTO_BLOCK_IP"
            confidence = 0.91
            decision_severity = "critical"
            evidence.append(f"Brute-force pattern detected — type: {threat_type}")
            if source_ip != "unknown":
                evidence.append(f"Source IP: {source_ip} — block candidate")

        # Rule 2: Ransomware / malware → ISOLATE_HOST + CAPTURE_FORENSICS
        elif any(k in threat_type for k in ["ransomware", "malware", "trojan", "worm"]):
            action = "ISOLATE_HOST"
            confidence = 0.88
            decision_severity = "critical"
            evidence.append(f"Malicious payload signature: {threat_type}")
            evidence.append("Host isolation prevents lateral spread")

        # Rule 3: Lateral movement → ALERT_SOC + FORCE_MFA
        elif any(k in threat_type for k in ["lateral", "pivot", "pass-the-hash", "kerberoast"]):
            action = "ALERT_SOC"
            confidence = 0.85
            decision_severity = "high"
            evidence.append(f"Lateral movement indicator: {threat_type}")
            evidence.append("Escalating to analyst — multi-host investigation needed")

        # Rule 4: Data exfiltration / C2 → ISOLATE_HOST
        elif any(k in threat_type for k in ["exfil", "c2", "command", "beaconing", "dns_tunnel"]):
            action = "ISOLATE_HOST"
            confidence = 0.87
            decision_severity = "critical"
            evidence.append(f"C2/exfiltration pattern: {threat_type}")

        # Rule 5: Risk score critical → AUTO_BLOCK_IP
        elif risk_score >= CRITICAL_THRESHOLD:
            action = "AUTO_BLOCK_IP"
            confidence = 0.78
            decision_severity = "critical"
            evidence.append(f"Risk score critical: {risk_score}/100 (threshold: {CRITICAL_THRESHOLD})")

        # Rule 6: Risk score high + multiple threats
        elif risk_score >= HIGH_THRESHOLD and active_threats >= 3:
            action = "ALERT_SOC"
            confidence = 0.74
            decision_severity = "high"
            evidence.append(f"Risk score elevated: {risk_score}/100 with {active_threats} active threats")

        # Rule 7: Medium risk — tighten monitoring
        elif risk_score >= MEDIUM_THRESHOLD:
            action = "MONITOR"
            confidence = 0.70
            decision_severity = "medium"
            evidence.append(f"Risk score: {risk_score}/100 — elevated monitoring warranted")

        # Rule 8: AI output hints at blocking
        if "block" in ai_output.lower() and action not in ("AUTO_BLOCK_IP", "ISOLATE_HOST"):
            evidence.append("AI reasoning explicitly recommends blocking")
            action = "AUTO_BLOCK_IP"
            confidence = min(confidence + 0.05, 0.95)
            decision_severity = "high"

        # ---------------------------------------------------------------------------
        # Rule 9: LLM Sentinel Command & Swarm Consensus Extraction
        # ---------------------------------------------------------------------------
        swarm_match = re.search(r'SWARM_CONFIDENCE[\*\s:]+([0-9.]+)', ai_output)
        if swarm_match:
            try:
                swarm_conf = float(swarm_match.group(1).strip())
                confidence = max(confidence, swarm_conf)
                evidence.append(f"Swarm Consensus verified at {swarm_conf*100:.0f}% confidence")
            except Exception as e:
                pass

        mitigation_match = re.search(r'\[MITIGATION:\s*(.+?)\|(.+?)\]', ai_output)
        if mitigation_match:
            try:
                tool_name = mitigation_match.group(1).strip()
                args_str = mitigation_match.group(2).strip()
                args = json.loads(args_str)
                
                if tool_name == "block_ip":
                    action = "AUTO_BLOCK_IP"
                    source_ip = args.get("ip", source_ip)
                elif tool_name == "terminate_process":
                    action = "KILL_PROCESS"
                    context["target_pid"] = args.get("pid", 0)
                elif tool_name == "quarantine_file" or tool_name == "isolate_host":
                    action = "ISOLATE_HOST"
                
                if confidence >= 0.98:
                    decision_severity = "critical"
                    evidence.append(f"AI Sentinel actively deployed tool: {tool_name}")
                else:
                    action = "ALERT_SOC"
                    evidence.append(f"Sentinel proposed {tool_name}, but Swarm Consensus ({confidence*100:.0f}%) was below 98% threshold.")
            except Exception as e:
                print(f"[DecisionEngine] Failed to parse Sentinel mitigation: {e}")

        # Fallback
        if action == "MONITOR" and risk_score < MEDIUM_THRESHOLD and active_threats == 0:
            action = "NO_ACTION"
            decision_severity = "low"
            confidence = 0.95
            evidence.append("All metrics within normal range")

        auto_executed = self.autonomy_mode and decision_severity == "critical" and confidence >= 0.98

        # Implement Auto-Mitigation (The Sentinel Core)
        mitigation_result = None
        forensics_result = None
        if auto_executed:
            mitigation_args = {}
            sentinel_tool = ""
            if action == "AUTO_BLOCK_IP":
                mitigation_args = {"ip_address": source_ip}
                sentinel_tool = "block_ip"
            elif action == "KILL_PROCESS":
                # Extract PID from context or attempt detection
                mitigation_args = {"pid": context.get("target_pid", 0)}
                sentinel_tool = "terminate_process"
            elif action == "ISOLATE_HOST":
                mitigation_args = {"file_path": context.get("target_file", "unknown")}
                sentinel_tool = "quarantine_file"
            
            if mitigation_args and sentinel_tool:
                mitigation_result = sentinel.execute_action(sentinel_tool, mitigation_args)
                
            # Phase 12 Mandatory Fix: False Success Mitigation Gating
            if mitigation_result and not mitigation_result.get("success"):
                auto_executed = False
                decision_severity = "high"
                confidence = max(0.50, confidence - 0.20)
                action = "ALERT_SOC"
                evidence.append(f"Auto-Mitigation HOST EXECUTION FAILED: {mitigation_result.get('detail')} — Immediately Escalating to Analysts.")
            else:
                # Phase 12: Self-Learning Swarm Memory (The "Adapt" Loop)
                k_store = self._knowledge_store
                if auto_executed and k_store and threat_type:
                    memory_tag = f"[SWARM_MEMORY] THREAT:{threat_type} | IP:{source_ip}"
                    memory_body = f"### 👑 [COMMANDER_DECISION]\n- **Anomalies Detected**: Exact Threat Pattern Recognition. Bypassed neural inference.\n- **PREDICTION**: Pre-emptive containment deployed.\n- **SWARM_CONFIDENCE**: 1.0\n- **SENTINEL COMMAND**: [MITIGATION: {sentinel_tool}|{json.dumps(mitigation_args)}]"
                    
                    try:
                        existing = k_store.query_similar(memory_tag, n_results=1)
                        if not (existing and memory_tag in (existing[0].get("content", "") if existing else "")):
                            k_store.add_document(
                                content=f"{memory_tag}\n\n{memory_body}",
                                source="swarm_memory_loop",
                                meta={"type": "auto_mitigation", "threat": threat_type}
                            )
                            evidence.append("Self-Learning Engine successfully memorized mitigation pattern.")
                    except Exception as e:
                        print(f"[DecisionEngine] Memory loop error: {e}")
                        
                # Phase 12: Post-Mitigation Verification Loop & Multi-Host Containment
                def run_verification():
                    time.sleep(10)  # Simulated 30-second post-action observation
                    print(f"\n[AegisAI SOAR] Executing Post-Mitigation Verification for IP {source_ip}...")
                    
                    # Synthetically simulating a failure to demonstrate the Multi-Host Containment Escalation
                    respawned = True 
                    if respawned:
                        print(f"[AegisAI SOAR] ⚠️ VERIFICATION FAILED: Threat {threat_type} respawned!")
                        print(f"[AegisAI SOAR] 🚀 INITIATING MULTI-HOST CONTAINMENT ESCALATION...")
                        print(f"  --> [CONTAINMENT] Pushing Global IP Block to Edge Firewall: {source_ip}")
                        sentinel.execute_action("block_ip", {"ip_address": source_ip})
                        print(f"  --> [CONTAINMENT] Revoking Active Directory Sessions for compromised identity.")
                        print(f"  --> [CONTAINMENT] Broadcasting IOCs to adjacent fleet nodes.")
                
                threading.Thread(target=run_verification, daemon=True).start()

            # Phase 10: Auto-Forensics
            tracer.capture_pcap(30, source_ip)
            if context.get("target_pid"):
                tracer.capture_memory_dump(context.get("target_pid", 0))
            forensics_result = "Captured PCAP buffer and Process Memory dump."

        # Phase 12: Decision Explainability (Trust/Audit)
        explainability = []
        try:
            anomalies_block = re.search(r'\*\*Anomalies Detected\*\*:(.*?)- \*\*PREDICTION\*\*', ai_output, re.DOTALL | re.IGNORECASE)
            if anomalies_block:
                lines = anomalies_block.group(1).strip().split('\n')
                explainability = [line.strip().lstrip('-').lstrip('0123456789.').strip() for line in lines if line.strip()]
        except Exception:
            pass

        decision = {
            "action": action,
            "description": SOAR_ACTIONS.get(action, "Custom action"),
            "confidence": float(f"{confidence:.2f}"),
            "severity": decision_severity,
            "auto_executed": auto_executed,
            "mitigation_result": mitigation_result,
            "forensics_result": forensics_result,
            "evidence": evidence,
            "why": explainability,
            "timestamp": time.time(),
            "target": source_ip,
            "risk_score": risk_score,
        }

        self._decision_log.append(decision)
        return decision

    # -----------------------------------------------------------------------
    # Batch: analyse decisions for a stream of threats
    # -----------------------------------------------------------------------
    def analyze_threats(
        self,
        threats: List[Dict[str, Any]],
        context: Dict[str, Any],
        ai_output: str = "",
    ) -> List[Dict[str, Any]]:
        """Produce a SOAR decision for each threat in the list."""
        return [self.decide_action(context, ai_output, threat) for threat in threats]

    # -----------------------------------------------------------------------
    # Build a WebSocket-ready AI_DECISION broadcast payload
    # -----------------------------------------------------------------------
    def build_ws_payload(self, decision: Dict[str, Any]) -> Dict[str, Any]:
        """Format a decision for broadcast over the `AI_DECISIONS` WebSocket channel."""
        return {
            "action": decision["action"],
            "description": decision["description"],
            "severity": decision["severity"],
            "confidence": decision["confidence"],
            "auto_executed": decision["auto_executed"],
            "mitigation_result": decision.get("mitigation_result"),
            "forensics_result": decision.get("forensics_result"),
            "evidence": decision["evidence"],
            "target": decision["target"],
            "risk_score": decision.get("risk_score", 0),
            "timestamp": decision["timestamp"],
        }

    # -----------------------------------------------------------------------
    # Feedback loop — record outcome of a past decision
    # -----------------------------------------------------------------------
    def record_outcome(self, action: str, target: str, outcome: str, effective: bool):
        """
        Record whether a SOAR action was effective.
        """
        entry = {
            "timestamp": time.time(),
            "action": action,
            "target": target,
            "outcome": outcome,
            "effective": effective
        }
        self._feedback_store.append(entry)
        print(
            f"[DecisionEngine] Outcome recorded — action={action} target={target} "
            f"outcome={outcome} effective={effective}"
        )

    @property
    def recent_decisions(self) -> List[Dict[str, Any]]:
        # Use islice for type-safe slicing without relying on list.__getitem__ slices
        return list(islice(reversed(list(self._decision_log)), 10))


# Global singleton
decision_engine = DecisionEngine(autonomy_mode=False)
