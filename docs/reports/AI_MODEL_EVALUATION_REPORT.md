# AI Model Evaluation Report

**Status:** Template — populate after Phase 23 (AI Model Testing)

## Model
Isolation Forest (scikit-learn)
Contamination: 0.05
Training data: synthetic access logs

## Evaluation Metrics

| Metric | Value | Notes |
|:---|:---|:---|
| True Positive Rate | [measured] | Anomalies correctly detected |
| False Positive Rate | [measured] | Normal events flagged as anomalous |
| Precision | [measured] | |
| Recall | [measured] | |
| F1 Score | [measured] | |

## Test Scenarios
- Normal access pattern: [result]
- After-hours access: [result]
- Rapid-fire access: [result]
- Cross-department access: [result]
- Failed access spike: [result]

## Limitations
Model trained on synthetic data. Real-world performance may differ.
Retraining on production data required before production deployment.
