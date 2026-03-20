"""
AegisAI v4.5 — Elite SOAR v2.5 Policy Engine
Governs autonomous response actions based on Dynamic Risk, Asset Criticality, and Time-Context.
"""

from typing import Dict, Any, List, Optional
import time
from datetime import datetime

class ResponsePolicy:
    def __init__(self, action: str, min_risk: int, max_asset_criticality: int, auto_approve: bool = False, time_window: Optional[tuple[int, int]] = None):
        self.action = action
        self.min_risk = min_risk
        self.max_asset_criticality = max_asset_criticality # 1=General, 5=Critical
        self.auto_approve = auto_approve
        self.time_window = time_window # (start_hour, end_hour) 0-23

class PolicyEngine:
    def __init__(self):
        # Elite v2.5 Policies
        self.policies = [
            # 1. Critical Night-Watch Policy (Ultra-strict between 22:00 and 06:00)
            ResponsePolicy(action="isolate_host", min_risk=65, max_asset_criticality=3, auto_approve=True, time_window=(22, 6)),
            # 2. Daytime Protection (Workstations)
            ResponsePolicy(action="kill_process", min_risk=80, max_asset_criticality=2, auto_approve=True),
            # 3. Critical Infrastructure Protection (Always manual review)
            ResponsePolicy(action="isolate_host", min_risk=95, max_asset_criticality=5, auto_approve=False),
            # 4. Neural Quarantine (New Action)
            ResponsePolicy(action="quarantine_file", min_risk=70, max_asset_criticality=3, auto_approve=True)
        ]

    def evaluate(self, threat: Dict[str, Any], asset_type: str, system_risk: float = 0.0) -> Dict[str, Any]:
        """
        Determines the appropriate response action with dynamic risk-adaptive thresholds.
        """
        current_hour = datetime.now().hour
        threat_risk = float(threat.get("confidence", 0))
        asset_crit = self._get_criticality(asset_type)
        
        # Risk-Adaptive Tuning: If system-wide risk is high (>60), lower the individual action thresholds by 15%
        risk_multiplier = 0.85 if system_risk > 60 else 1.0
        
        # Identify the most aggressive applicable policy
        for policy in self.policies:
            # Check Time-Window (Ultra-Defensive Guard for Pyre2)
            tw = policy.time_window
            if tw is not None and isinstance(tw, tuple) and len(tw) == 2:
                start_h = int(tw[0])
                end_h = int(tw[1])
                is_in_window = (current_hour >= start_h or current_hour < end_h) if start_h > end_h else (start_h <= current_hour < end_h)
                if not is_in_window:
                    continue

            # Evaluate Threshold with multi-factor weighting
            adjusted_min_risk = float(policy.min_risk) * risk_multiplier
            
            if threat_risk >= adjusted_min_risk and asset_crit <= policy.max_asset_criticality:
                mode = "autonomous" if policy.auto_approve else "manual_review"
                
                # Manual Float-Rounding to satisfy Pyre2's round() overload check
                safe_threshold = float(int(adjusted_min_risk * 10) / 10.0)
                safe_system_risk = float(int(system_risk * 10) / 10.0)
                
                return {
                    "action": policy.action,
                    "mode": mode,
                    "policy_id": f"ELITE_POL_{policy.action.upper()}",
                    "approved": policy.auto_approve,
                    "metadata": {
                        "adjusted_threshold": safe_threshold,
                        "system_risk_context": safe_system_risk,
                        "time_context": f"{current_hour}:00h"
                    }
                }
        
        return {"action": "none", "mode": "monitor", "approved": False}

    def _get_criticality(self, asset_type: str) -> int:
        mapping = {
            "Critical_DB_Tier": 5,
            "Command_Console": 4,
            "Public_Gateway": 3,
            "Workstation": 1
        }
        return mapping.get(asset_type, 1)

policy_engine = PolicyEngine()
