"""Tests for Isolation Forest scoring and the threshold policy (docs/ai/06).

The models used here are trained on small FIXTURE datasets inside the tests —
test fixtures only; the product never generates training data (train.py uses
real access logs, and model.py refuses to start without a trained model).
"""
import pickle
import sys
import tempfile
from pathlib import Path

import numpy as np
from sklearn.ensemble import IsolationForest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.alerting import describe_pattern  # noqa: E402
from app.model import ModelManager  # noqa: E402


def _make_manager():
    """Builds a ModelManager backed by a small fixture-trained forest in a temp dir."""
    with tempfile.TemporaryDirectory() as tmp:
        model_path = str(Path(tmp) / "model.pkl")
        rng = np.random.default_rng(7)
        # Fixture: business-hours cluster with low rates
        normal = np.column_stack([
            rng.integers(6, 23, 200).astype(float),
            rng.integers(0, 7, 200).astype(float),
            rng.exponential(0.5, 200),
            rng.exponential(2.0, 200),
            rng.exponential(0.3, 200),
            rng.integers(0, 4, 200).astype(float),
        ])
        model = IsolationForest(n_estimators=20, contamination=0.05, random_state=7).fit(normal)
        with open(model_path, "wb") as fh:
            pickle.dump(model, fh)
        yield ModelManager(model_path=model_path, contamination=0.05,
                           n_estimators=20, threshold=-0.1)


def test_loaded_model_returns_scores_in_range():
    for manager in _make_manager():
        score = manager.score([12.0, 2.0, 1.0, 5.0, 0.0, 1.0])
        assert -1.0 <= score <= 1.0


def test_anomalous_features_score_lower_than_normal():
    for manager in _make_manager():
        normal = manager.score([12.0, 2.0, 1.0, 5.0, 0.0, 1.0])
        # Out-of-hours + rapid-fire + denied spike
        anomalous = manager.score([2.0, 3.0, 40.0, 90.0, 12.0, 3.0])
        assert anomalous < normal


def test_threshold_policy():
    for manager in _make_manager():
        assert manager.is_anomaly(-0.5) is True    # below -0.1
        assert manager.is_anomaly(-0.05) is False  # above -0.1
        assert manager.is_anomaly(0.2) is False


def test_missing_model_raises_actionable_error():
    with tempfile.TemporaryDirectory() as tmp:
        missing = str(Path(tmp) / "does-not-exist.pkl")
        try:
            ModelManager(model_path=missing, threshold=-0.1)
            assert False, "expected RuntimeError for missing model"
        except RuntimeError as exc:
            assert "does not generate training data" in str(exc)
            assert "train.py" in str(exc)


def test_describe_pattern_out_of_hours():
    assert "business hours" in describe_pattern([23.0, 3.0, 0.0, 0.0, 0.0, 0.0])


def test_describe_pattern_rapid_fire():
    assert "Rapid-fire" in describe_pattern([12.0, 3.0, 15.0, 20.0, 0.0, 2.0])


def test_describe_pattern_denied_spike():
    assert "Failed access spike" in describe_pattern([12.0, 3.0, 1.0, 5.0, 9.0, 1.0])