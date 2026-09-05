"""Tests for Isolation Forest scoring and the threshold policy (docs/ai/06)."""
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.alerting import describe_pattern  # noqa: E402
from app.model import ModelManager  # noqa: E402


def _make_manager():
    # Train a fresh model in a temp dir (no pkl present)
    with tempfile.TemporaryDirectory() as tmp:
        yield ModelManager(
            model_path=str(Path(tmp) / "model.pkl"),
            contamination=0.05,
            n_estimators=50,
            threshold=-0.1,
        )


def test_trained_model_returns_scores_in_range():
    for manager in _make_manager():
        # Normal-looking features: business hour, low rates
        score = manager.score([12.0, 2.0, 1.0, 5.0, 0.0, 1.0])
        assert -1.0 <= score <= 1.0


def test_anomalous_features_score_lower_than_normal():
    for manager in _make_manager():
        normal = manager.score([12.0, 2.0, 1.0, 5.0, 0.0, 1.0])
        # Anomalous: night hour + rapid-fire + denied spike
        anomalous = manager.score([2.0, 3.0, 40.0, 90.0, 12.0, 3.0])
        assert anomalous < normal


def test_threshold_policy():
    for manager in _make_manager():
        assert manager.is_anomaly(-0.5) is True    # below -0.1
        assert manager.is_anomaly(-0.05) is False  # above -0.1
        assert manager.is_anomaly(0.2) is False


def test_describe_pattern_out_of_hours():
    assert "business hours" in describe_pattern([23.0, 3.0, 0.0, 0.0, 0.0, 0.0])


def test_describe_pattern_rapid_fire():
    assert "Rapid-fire" in describe_pattern([12.0, 3.0, 15.0, 20.0, 0.0, 2.0])


def test_describe_pattern_denied_spike():
    assert "Failed access spike" in describe_pattern([12.0, 3.0, 1.0, 5.0, 9.0, 1.0])