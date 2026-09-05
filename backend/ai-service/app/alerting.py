"""Alert pipeline to the Java backend (docs/ai/08_ALERT_PIPELINE.md).

When the Isolation Forest score falls below the threshold, the AI service
POSTs an alert to the Java SecurityEventService:

    POST {JAVA_BACKEND_URL}/api/security/ai-alert
    {
      "did": "did:cypherid:0x...",
      "anomalyScore": -0.32,
      "features": {...},
      "patternDescription": "Rapid-fire access (12 accesses/min)"
    }

The Java side persists the alert, raises an AI_ANOMALY security event, and
publishes to the security-alerts Kafka topic.
"""
import logging

import requests

from . import config

logger = logging.getLogger(__name__)

# Human-readable pattern descriptions derived from the feature vector
# (detection patterns in docs/ai/02_ANOMALY_DETECTION.md).
def describe_pattern(features: list) -> str:
    hour = int(features[0])
    access_1min = features[2]
    denied_10min = features[4]

    if hour < 6 or hour > 22:
        return "Access outside business hours"
    if access_1min > 10:
        return f"Rapid-fire access ({access_1min:.0f} accesses/min)"
    if denied_10min > 5:
        return f"Failed access spike ({denied_10min:.0f} denials/10min)"
    return "IsolationForest anomaly (score below threshold)"


def post_alert(did: str, score: float, features: list, pattern: str) -> bool:
    """Posts an anomaly alert to the Java backend. Best-effort, never raises."""
    url = config.JAVA_BACKEND_URL + config.ALERT_ENDPOINT
    payload = {
        "did": did,
        "anomalyScore": score,
        "features": {
            "hour_of_day": int(features[0]),
            "day_of_week": int(features[1]),
            "access_rate_1min": round(features[2], 3),
            "access_rate_10min": round(features[3], 3),
            "denied_rate_10min": round(features[4], 3),
            "classification_score": int(features[5]),
        },
        "patternDescription": pattern,
    }
    try:
        response = requests.post(url, json=payload, timeout=config.ALERT_TIMEOUT_SECONDS)
        if response.ok:
            logger.info("AI alert delivered for %s (score=%.3f)", did, score)
            return True
        logger.warning("AI alert rejected by backend: %s %s", response.status_code, response.text)
    except requests.RequestException as exc:
        logger.warning("AI alert delivery failed: %s", exc)
    return False