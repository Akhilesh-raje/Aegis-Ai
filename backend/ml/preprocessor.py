"""
Feature Extraction & Preprocessing
Converts aggregated windows into scaled numerical vectors for ML models.
"""

import numpy as np
from sklearn.preprocessing import StandardScaler

FEATURE_NAMES = [
    "login_attempt_rate",
    "failed_login_ratio",
    "unique_ports",
    "connection_frequency",
    "avg_payload_size",
    "unique_users",
    "session_variation",
    "hour_of_day",
    "geo_anomaly",
]


class Preprocessor:
    """Extracts feature vectors from aggregated windows and applies scaling."""

    def __init__(self):
        self.scaler = StandardScaler()
        self._is_fitted = False

    def extract_features(self, windows: list[dict]) -> np.ndarray:
        """Extract raw feature matrix from aggregated windows."""
        matrix = []
        for w in windows:
            feats = w["features"]
            row = [feats.get(name, 0) for name in FEATURE_NAMES]
            matrix.append(row)
        return np.array(matrix, dtype=np.float64)

    def fit(self, X: np.ndarray):
        """Fit the scaler on training data."""
        self.scaler.fit(X)
        self._is_fitted = True

    def transform(self, X: np.ndarray) -> np.ndarray:
        """Scale features using the fitted scaler."""
        if not self._is_fitted:
            # Auto-fit if not yet fitted (first-run convenience)
            self.scaler.fit(X)
            self._is_fitted = True
        return self.scaler.transform(X)

    def fit_transform(self, X: np.ndarray) -> np.ndarray:
        """Fit and transform in one step."""
        self._is_fitted = True
        return self.scaler.fit_transform(X)

    @property
    def feature_names(self) -> list[str]:
        return FEATURE_NAMES
