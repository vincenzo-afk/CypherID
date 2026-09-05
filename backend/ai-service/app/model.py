"""Isolation Forest anomaly detection model (docs/ai/04, 05, 06).

Model lifecycle:
1. At startup, load `model/isolation_forest.pkl` if present.
2. Otherwise, train a model on synthetic access-log data (the docs specify a
   pre-trained synthetic demo model) and persist it to the same path.

Scoring follows docs/ai/06_THRESHOLD_POLICY.md:
- Isolation Forest score in [-1, 0] is anomalous, [0, +1] normal.
- Events with score < AI_ANOMALY_THRESHOLD (default -0.1) are anomalies.
- contamination=0.05 (5% of training data expected anomalous).
"""
import logging
import os
import pickle

import numpy as np
from sklearn.ensemble import IsolationForest

logger = logging.getLogger(__name__)


class ModelManager:
    """Loads / trains / persists the IsolationForest and scores feature vectors."""

    def __init__(self, model_path: str, contamination: float = 0.05,
                 n_estimators: int = 100, threshold: float = -0.1):
        self.model_path = model_path
        self.contamination = contamination
        self.n_estimators = n_estimators
        self.threshold = threshold
        self.model = self._load_or_train()

    # ── Public API ────────────────────────────────────────────────────────────

    def score(self, features: list) -> float:
        """Returns the Isolation Forest anomaly score for a feature vector.

        Negative = anomalous, more negative = more anomalous.
        """
        if len(features) != 6:
            raise ValueError(f"Expected 6 features, got {len(features)}")
        scores = self.model.score_samples(np.asarray([features], dtype=float))
        return float(scores[0])

    def is_anomaly(self, score: float) -> bool:
        """Applies the threshold policy (docs/ai/06)."""
        return score < self.threshold

    # ── Loading / training ────────────────────────────────────────────────────

    def _load_or_train(self) -> IsolationForest:
        if os.path.exists(self.model_path):
            try:
                with open(self.model_path, "rb") as fh:
                    model = pickle.load(fh)
                logger.info("Loaded Isolation Forest model from %s", self.model_path)
                return model
            except Exception as exc:  # noqa: BLE001 - fall back to training
                logger.warning("Failed to load model %s (%s); retraining", self.model_path, exc)

        logger.info("Training Isolation Forest on synthetic access data (contamination=%.2f)",
                    self.contamination)
        model = self._train_synthetic()
        os.makedirs(os.path.dirname(self.model_path) or ".", exist_ok=True)
        with open(self.model_path, "wb") as fh:
            pickle.dump(model, fh)
        logger.info("Persisted trained model to %s", self.model_path)
        return model

    def _train_synthetic(self) -> IsolationForest:
        """Trains on synthetic access-log data: ~95% normal, ~5% anomalous.

        Normal samples: business hours (6-22), low access/denied rates.
        Anomalies: out-of-hours, rapid-fire access, or failed-access spikes.
        """
        rng = np.random.default_rng(42)
        n_normal = 1900
        n_anomaly = 100

        normal = np.column_stack([
            rng.integers(6, 23, n_normal).astype(float),              # hour
            rng.integers(0, 7, n_normal).astype(float),               # day
            rng.exponential(0.5, n_normal),                           # access_1min
            rng.exponential(2.0, n_normal),                           # access_10min
            rng.exponential(0.3, n_normal),                           # denied_10min
            rng.integers(0, 4, n_normal).astype(float),               # classification
        ])

        # Anomalies: night access, high rates, or failed-access spikes
        anomaly = np.column_stack([
            rng.choice([0, 1, 2, 3, 23], n_anomaly).astype(float),   # out-of-hours
            rng.integers(0, 7, n_anomaly).astype(float),
            rng.uniform(10, 60, n_anomaly),                           # rapid-fire
            rng.uniform(20, 120, n_anomaly),
            rng.uniform(5, 30, n_anomaly),                            # denied spike
            rng.integers(0, 4, n_anomaly).astype(float),
        ])

        X = np.vstack([normal, anomaly])
        model = IsolationForest(
            n_estimators=self.n_estimators,
            contamination=self.contamination,
            random_state=42,
        )
        model.fit(X)
        return model