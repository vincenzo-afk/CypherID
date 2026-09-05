"""Tests for feature extraction (docs/ai/03_FEATURE_ENGINEERING.md)."""
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.features import FeatureExtractor, day_of_week, hour_of_day  # noqa: E402


def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()


def test_hour_and_day_parsing():
    dt = datetime(2026, 9, 5, 14, 30, tzinfo=timezone.utc)  # Saturday
    assert hour_of_day(_iso(dt)) == 14
    assert day_of_week(_iso(dt)) == 5  # 0=Mon..6=Sun, Saturday=5


def test_features_basic_fields():
    extractor = FeatureExtractor(window_seconds=600)
    event = {
        "did": "did:cypherid:user1",
        "resourceId": "DRDO-DOC-007",
        "action": "READ",
        "decision": "GRANTED",
        "timestamp": _iso(datetime(2026, 9, 5, 10, 0, tzinfo=timezone.utc)),
    }
    features = extractor.features(event)

    assert len(features) == 6
    assert features[0] == 10.0          # hour_of_day
    assert features[1] == 5.0           # day_of_week (Saturday)
    assert features[2] >= 1.0           # access_rate_1min includes current event
    assert features[3] >= 1.0           # access_rate_10min includes current event
    assert features[4] == 0.0           # denied_rate_10min
    assert features[5] == 0.0           # classification_score (default UNCLASSIFIED)


def test_rapid_fire_access_detected_in_rate():
    extractor = FeatureExtractor(window_seconds=600)
    base = datetime(2026, 9, 5, 10, 0, tzinfo=timezone.utc)

    for i in range(11):
        extractor.ingest({
            "did": "did:cypherid:user1",
            "decision": "GRANTED",
            "timestamp": _iso(base + timedelta(seconds=i * 5)),
        })

    features = extractor.features({
        "did": "did:cypherid:user1",
        "decision": "GRANTED",
        "timestamp": _iso(base + timedelta(seconds=55)),
    })
    assert features[2] >= 11.0  # 12 events within the last minute


def test_denied_spike_reflected_in_denied_rate():
    extractor = FeatureExtractor(window_seconds=600)
    base = datetime(2026, 9, 5, 10, 0, tzinfo=timezone.utc)

    for i in range(6):
        extractor.ingest({
            "did": "did:cypherid:user1",
            "decision": "DENIED",
            "timestamp": _iso(base + timedelta(seconds=i * 10)),
        })

    features = extractor.features({
        "did": "did:cypherid:user1",
        "decision": "DENIED",
        "timestamp": _iso(base + timedelta(seconds=60)),
    })
    assert features[4] >= 6.0


def test_window_prunes_old_events():
    extractor = FeatureExtractor(window_seconds=60)
    base = datetime(2026, 9, 5, 10, 0, tzinfo=timezone.utc)

    # Old event outside the window
    extractor.ingest({
        "did": "did:cypherid:user1",
        "decision": "GRANTED",
        "timestamp": _iso(base - timedelta(minutes=5)),
    })
    # Fresh event
    extractor.ingest({
        "did": "did:cypherid:user1",
        "decision": "GRANTED",
        "timestamp": _iso(base),
    })

    features = extractor.features({
        "did": "did:cypherid:user1",
        "decision": "GRANTED",
        "timestamp": _iso(base + timedelta(seconds=1)),
    })
    assert features[3] < 3.0  # old event pruned; only fresh + current remain