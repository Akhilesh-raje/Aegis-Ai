"""
Random Forest Threat Classifier
Classifies detected anomalies into specific attack categories.
"""

from typing import List, Dict, Any, Optional
import numpy as np
from sklearn.ensemble import RandomForestClassifier

THREAT_TYPES = ["brute_force", "ddos", "port_scan", "exfiltration", "insider_threat"]
CONFIDENCE_THRESHOLD = 0.6


class ThreatClassifier:
    """Classifies anomalies into threat categories using Random Forest."""

    def __init__(self, random_state: int = 42):
        self.model = RandomForestClassifier(
            n_estimators=100,
            random_state=random_state,
            max_depth=10,
        )
        self._is_fitted = False
        self.classes = THREAT_TYPES

    def fit(self, X: np.ndarray, y: np.ndarray):
        """Train the classifier on labeled threat data."""
        self.model.fit(X, y)
        self._is_fitted = True
        self.classes = list(self.model.classes_)

    def classify(self, X: np.ndarray) -> list[dict]:
        """
        Classify anomalous samples.
        Returns threat type and confidence. Falls back to 'unknown_anomaly'
        if confidence is below threshold.
        """
        if not self._is_fitted:
            raise RuntimeError("Classifier not fitted. Call fit() first.")

        predictions = self.model.predict(X)
        probabilities = self.model.predict_proba(X)

        results = []
        for pred, proba in zip(predictions, probabilities):
            max_confidence = float(np.max(proba))
            if max_confidence < CONFIDENCE_THRESHOLD:
                threat_type = "unknown_anomaly"
            else:
                threat_type = str(pred)

            results.append({
                "threat_type": threat_type,
                "confidence": float(f"{max_confidence * 100:.1f}"),
                "probabilities": {
                    cls: float(f"{float(p) * 100:.1f}")
                    for cls, p in zip(self.classes, proba)
                },
            })

        return results

    @property
    def model_info(self) -> dict:
        return {
            "model_type": "Random Forest Classifier",
            "classes": self.classes,
            "confidence_threshold": CONFIDENCE_THRESHOLD,
            "is_fitted": self._is_fitted,
        }


def generate_synthetic_training_data(preprocessor, aggregator) -> tuple[np.ndarray, np.ndarray]:
    """
    Generate synthetic labeled training data for the classifier.
    Uses the log_generator attack patterns to create labeled examples.
    """
    from backend.simulator.log_generator import (
        generate_brute_force_events,
        generate_ddos_events,
        generate_port_scan_events,
        generate_exfiltration_events,
    )

    X_all = []
    y_all = []

    attack_configs = [
        ("brute_force", generate_brute_force_events, 40),
        ("ddos", generate_ddos_events, 40),
        ("port_scan", generate_port_scan_events, 40),
        ("exfiltration", generate_exfiltration_events, 40),
    ]

    for label, generator, n_samples in attack_configs:
        for _ in range(n_samples):
            events = generator()
            windows = aggregator.aggregate(events)
            features = preprocessor.extract_features(windows)
            for row in features:
                X_all.append(row)
                y_all.append(label)

    return np.array(X_all), np.array(y_all)
