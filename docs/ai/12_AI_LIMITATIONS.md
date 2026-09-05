# AI Limitations

## Model Limitations
1. Isolation Forest is unsupervised — no labeled attack data used in training
2. Trained on synthetic data for demo; may not generalize to real patterns
3. Novel attack patterns not represented in training data may not be detected
4. Model drift: access patterns change over time; periodic retraining required

## Detection Limitations
1. Cannot detect camera capture (no observable signal)
2. Cannot detect screen recording (no observable signal)
3. Cannot detect slow, patient insider threat with normal-appearing access patterns
4. Geographic IP anomaly depends on historical IP clustering; new legitimate locations flagged

## False Positive Risk
False positives create alert fatigue. Threshold must be tuned carefully.
All AI alerts are advisory; human review is the authoritative decision.

## No Automated Action
AI alerts do NOT automatically revoke access or suspend DIDs.
Alerts are logged on-chain and surfaced to administrators.
Human decision required for access revocation.

## Privacy
AI features are behavioral signals; no personal data beyond DID is used.
Model does not make inferences about identity, health, or personal attributes.
