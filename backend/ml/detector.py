"""
Isolation Forest Anomaly Detector
Detects anomalous behavioral patterns in aggregated feature vectors.
"""

from typing import List, Dict, Any, Optional
# pyre-ignore[21]
import numpy as np
# pyre-ignore[21]
from sklearn.ensemble import IsolationForest


class AnomalyDetector:
    """Wraps scikit-learn IsolationForest for streaming anomaly detection."""

    def __init__(self, contamination: float = 0.15, n_estimators: int = 100, random_state: int = 42):
        self.model = IsolationForest(
            contamination=contamination,
            n_estimators=n_estimators,
            random_state=random_state,
        )
        self._is_fitted = False
        self.contamination = contamination
        self.n_estimators = n_estimators

    def fit(self, X: np.ndarray):
        """Train the Isolation Forest on normal baseline data."""
        self.model.fit(X)
        self._is_fitted = True

    def predict(self, X: np.ndarray) -> np.ndarray:
        """
        Predict anomalies.
        Returns:  1 = normal, -1 = anomaly
        """
        if not self._is_fitted:
            raise RuntimeError("Detector not fitted. Call fit() with baseline data first.")
        return self.model.predict(X)

    def score_samples(self, X: np.ndarray) -> np.ndarray:
        """
        Return anomaly scores (decision_function).
        More negative = more anomalous.
        """
        if not self._is_fitted:
            raise RuntimeError("Detector not fitted. Call fit() with baseline data first.")
        return self.model.decision_function(X)

    def detect(self, X: np.ndarray) -> list[dict]:
        """
        Full detection pipeline.
        Returns list of dicts with is_anomaly, anomaly_score, confidence.
        """
        predictions = self.predict(X)
        scores = self.score_samples(X)

        results = []
        for pred, score in zip(predictions, scores):
            is_anomaly = pred == -1
            if is_anomaly:
                # Map anomaly score → confidence (more negative = higher confidence)
                confidence = min(99, max(50, int(70 + abs(score) * 80)))
            else:
                confidence = 0

            # Normalize score: decision_function is negative for anomalies.
            # Smaller scores = more outlier. We flip it so higher = more risk.
            raw_score: float = float(score)  # pyre-ignore[6]
            norm_score: float = abs(raw_score) if raw_score < 0 else 0.0
            results.append({
                "is_anomaly": is_anomaly,
                "anomaly_score": float(f"{norm_score:.4f}"),
                "confidence": confidence,
            })

        return results

    @property
    def model_info(self) -> dict:
        return {
            "model_type": "Isolation Forest",
            "n_estimators": self.n_estimators,
            "contamination": self.contamination,
            "is_fitted": self._is_fitted,
        }
