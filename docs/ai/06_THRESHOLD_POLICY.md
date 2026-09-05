# Threshold Policy

## Anomaly Score
Isolation Forest returns a score in range [-1, 0] for anomalies, [0, +1] for normal.
Negative score = anomaly. More negative = more anomalous.

## Default Threshold
`threshold = -0.1`
Events with score < -0.1 are classified as anomalies.

## Contamination Parameter
`contamination = 0.05` (5% of training data expected to be anomalous).
This controls the decision boundary during training.

## Configurable
Threshold is configurable via environment variable `AI_ANOMALY_THRESHOLD`.
Adjustment requires testing against validation set to avoid excessive false positives.

## Alert Rate Target
Target: < 1% false positive rate in normal operations.
Monitor: alert rate tracked in PostgreSQL; if > 5% in a day, threshold is reviewed.
