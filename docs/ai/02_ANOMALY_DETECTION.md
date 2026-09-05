# Anomaly Detection

## Algorithm
Isolation Forest — unsupervised anomaly detection.
Effective for tabular behavioral data without labeled anomaly examples.

## Detection Patterns

| Pattern | Signal |
|:---|:---|
| Access outside business hours | `hour < 6 or hour > 22` |
| Unusual IP (geographic anomaly) | Deviation from user's historical IP cluster |
| Rapid-fire access | >10 resource accesses per minute |
| Cross-department resource access | Accessing resources outside user's department |
| Failed access spike | >5 denied accesses in 10 minutes |
| Unusual resource classification | Accessing assets above typical user pattern |

## Not Detected
The AI system does NOT detect:
- Physical camera capture (no signal available)
- OS-level screen recording (no signal available)
- Content memorization

## Limitations
See `12_AI_LIMITATIONS.md`.
