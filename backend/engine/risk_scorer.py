"""
Dynamic Risk Scoring Engine
Calculates overall system security posture as a 0–100 score.
"""

import time
from collections import deque
from typing import Any, Optional, Dict, List


class RiskScorer:
    """
    Maintains a dynamic system risk score based on:
    - anomaly severity
    - attack frequency
    - asset sensitivity (v4)
    - time decay
    """

    # Severity weights per threat type
    SEVERITY_WEIGHTS = {
        "brute_force": 20,
        "ddos": 30,
        "port_scan": 10,
        "exfiltration": 35,
        "insider_threat": 25,
        "unknown_anomaly": 15,
    }

    # Asset criticality multipliers (v4)
    ASSET_MULTIPLIERS = {
        "Critical_DB_Tier": 2.5,
        "Command_Console": 1.5,
        "Public_Gateway": 1.2,
        "Workstation": 1.0,
    }

    def __init__(self, decay_rate: float = 0.95, max_history: int = 100):
        self.current_score: float = 0.0
        self.decay_rate = decay_rate
        self.max_history = max_history
        self.history: deque[Dict[str, Any]] = deque(maxlen=max_history)
        self._last_update = time.time()

    def update(self, threat_type: str, confidence: float, anomaly_score: float, asset_type: str = "Workstation") -> float:
        """
        Update risk score based on a new detected threat and asset context.
        """
        # Apply time decay since last update
        self._apply_decay()

        # Calculate threat contribution
        severity_weight = self.SEVERITY_WEIGHTS.get(threat_type, 15)
        confidence_factor = confidence / 100.0
        anomaly_factor = min(1.0, abs(anomaly_score) * 2)

        # Contextual Scaling (v4 Pillar)
        multiplier = self.ASSET_MULTIPLIERS.get(asset_type, 1.0)
        contribution = severity_weight * confidence_factor * anomaly_factor * multiplier

        # Add to current score, cap at 100
        self.current_score = min(100.0, self.current_score + contribution)

        # Record in history
        self.history.append({
            "timestamp": time.time(),
            "score": float(f"{self.current_score:.1f}"),
            "threat_type": threat_type,
            "contribution": float(f"{contribution:.1f}"),
            "asset_type": asset_type
        })

        self._last_update = time.time()
        round_score = float(f"{self.current_score:.1f}")
        return round_score

    def reduce(self, amount: float = 10.0) -> float:
        """
        Manually reduce risk score (e.g. when a threat is mitigated).
        """
        self.current_score = max(0.0, self.current_score - amount)

        self.history.append({
            "timestamp": time.time(),
            "score": float(f"{self.current_score:.1f}"),
            "threat_type": "mitigation",
            "contribution": -float(f"{amount:.1f}"),
        })

        round_score = float(f"{self.current_score:.1f}")
        return round_score

    def get_score(self) -> float:
        """Get current risk score with time decay applied."""
        self._apply_decay()
        round_val = float(f"{self.current_score:.1f}")
        return round_val

    def get_level(self) -> str:
        """Get human-readable risk level."""
        score = self.get_score()
        if score < 20:
            return "LOW"
        elif score < 50:
            return "MEDIUM"
        elif score < 75:
            return "HIGH"
        else:
            return "CRITICAL"

    def get_history(self, limit: int = 50) -> list[dict]:
        """Return recent risk score history for charting."""
        history_list: List[Dict[str, Any]] = list(self.history)
        result: List[Dict[str, Any]] = []
        if history_list:
            total_n = len(history_list)
            start_pos = max(0, total_n - limit)
            for i in range(start_pos, total_n):
                record = history_list[i]
                result.append(record)
        return result

    def reset(self):
        """Reset risk score to zero."""
        self.current_score = 0.0
        self.history.clear()

    def _apply_decay(self):
        """Apply time-based decay to the risk score."""
        now = time.time()
        elapsed = now - self._last_update
        # Decay every 5 seconds
        decay_periods = int(elapsed / 5)
        if decay_periods > 0:
            self.current_score *= self.decay_rate ** decay_periods
            self._last_update = now
            if self.current_score < 0.5:
                self.current_score = 0.0
