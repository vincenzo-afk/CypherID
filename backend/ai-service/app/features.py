"""Feature extraction (docs/ai/03_FEATURE_ENGINEERING.md).

Extracts a fixed feature vector from access log events consumed from Kafka.
A per-user sliding window (last 10 minutes) is kept in memory to compute
access / denied rates.

Extracted features:
    hour_of_day        (0-23)
    day_of_week        (0=Mon .. 6=Sun)
    access_rate_1min   accesses in the last minute
    access_rate_10min  accesses in the last 10 minutes
    denied_rate_10min  denied accesses in the last 10 minutes
    classification_score (0=UNCLASSIFIED .. 3=TOP_SECRET)

NOTE: ipAddress / deviceId / department are not present in the Phase-4
access-logs event; ip_deviation and dept_mismatch are omitted until the
pipeline enriches the event (documented in docs/ai/03).
"""
import threading
import time
from collections import deque
from datetime import datetime, timezone

CLASSIFICATION_SCORE = {
    "UNCLASSIFIED": 0,
    "CONFIDENTIAL": 1,
    "SECRET": 2,
    "TOP_SECRET": 3,
}


def parse_timestamp(value: str) -> float:
    """Parses an ISO-8601 timestamp into epoch seconds (UTC)."""
    if not value:
        return time.time()
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.timestamp()
    except ValueError:
        return time.time()


def hour_of_day(value: str) -> int:
    """Hour (0-23) of an ISO-8601 timestamp, in its own timezone / UTC fallback."""
    if not value:
        return datetime.now(timezone.utc).hour
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return dt.hour
    except ValueError:
        return datetime.now(timezone.utc).hour


def day_of_week(value: str) -> int:
    """Day of week (0=Mon .. 6=Sun) of an ISO-8601 timestamp."""
    if not value:
        return datetime.now(timezone.utc).weekday()
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return dt.weekday()
    except ValueError:
        return datetime.now(timezone.utc).weekday()


class FeatureExtractor:
    """Keeps a per-user sliding window of events and builds feature vectors."""

    def __init__(self, window_seconds: int = 600):
        self.window_seconds = window_seconds
        self._events: dict[str, deque] = {}
        self._lock = threading.Lock()

    def _window(self, user: str) -> deque:
        if user not in self._events:
            self._events[user] = deque()
        return self._events[user]

    def _prune(self, user: str, now: float) -> None:
        window = self._window(user)
        cutoff = now - self.window_seconds
        while window and window[0][0] < cutoff:
            window.popleft()

    def ingest(self, event: dict) -> None:
        """Records an access log event in the user's sliding window."""
        user = event.get("did", "unknown")
        ts = parse_timestamp(event.get("timestamp", ""))
        decision = event.get("decision", "DENIED")
        with self._lock:
            self._prune(user, ts)
            self._window(user).append((ts, decision))

    def features(self, event: dict) -> list:
        """Builds the feature vector for an event.

        All window pruning and rate computation is relative to the event's own
        timestamp (deterministic, independent of wall-clock time). The current
        event is included in the rate windows so that the first access of a
        burst already registers as an elevated rate.
        """
        user = event.get("did", "unknown")
        ts = parse_timestamp(event.get("timestamp", ""))

        with self._lock:
            self._prune(user, ts)
            window = list(self._window(user))
            window.append((ts, event.get("decision", "DENIED")))

            one_min_ago = ts - 60
            ten_min_ago = ts - 600

            access_1min = sum(1 for (t, _) in window if t >= one_min_ago)
            access_10min = sum(1 for (t, _) in window if t >= ten_min_ago)
            denied_10min = sum(1 for (t, d) in window if t >= ten_min_ago and d == "DENIED")

        classification = event.get("classification", "UNCLASSIFIED")
        classification_score = CLASSIFICATION_SCORE.get(str(classification).upper(), 0)

        return [
            float(hour_of_day(event.get("timestamp", ""))),
            float(day_of_week(event.get("timestamp", ""))),
            float(access_1min),
            float(access_10min),
            float(denied_10min),
            float(classification_score),
        ]


FEATURE_NAMES = [
    "hour_of_day",
    "day_of_week",
    "access_rate_1min",
    "access_rate_10min",
    "denied_rate_10min",
    "classification_score",
]