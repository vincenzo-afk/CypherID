"""Isolation Forest anomaly detection model (docs/ai/04, 05, 06).

The model is trained OFFLINE on REAL access-log data via train.py and loaded
from disk at startup. This service NEVER fabricates training data — if no
trained model is present, startup fails with an actionable error instead of
silently inventing a model.

Scoring follows docs/ai/06_THRESHOLD_POLICY.md:
- Isolation Forest score in [-1, 0] is anomalous, [0, +1] normal.
- Events with score < AI_ANOMALY_THRESHOLD (default -0.1) are anomalies.
- contamination=0.05 (5% of training data expected anomalous).
"""
import logging
import os
import pickle

import numpy as np

logger = logging.getLogger(__name__)


class ModelManager:
    """Loads a trained IsolationForest and scores feature vectors."""

    def __init__(self, model_path: str, contamination: float = 0.05,
                 n_estimators: int = 100, threshold: float = -0.1):
        self.model_path = model_path
        self.contamination = contamination
        self.n_estimators = n_estimators
        self.threshold = threshold
        self.model = self._load()

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

    # ── Loading ───────────────────────────────────────────────────────────────

    def _load(self):
        if not os.path.exists(self.model_path):
            raise RuntimeError(
                f"Trained Isolation Forest model not found at '{self.model_path}'. "
                "The AI service does not generate training data. Train the model on "
                "REAL access-log data first, e.g.:\n"
                "  python train.py --kafka-bootstrap localhost:9092 "
                "--topic access-logs --output model/isolation_forest.pkl"
            )
        with open(self.model_path, "rb") as fh:
            model = pickle.load(fh)
        logger.info("Loaded Isolation Forest model from %s", self.model_path)
        return model