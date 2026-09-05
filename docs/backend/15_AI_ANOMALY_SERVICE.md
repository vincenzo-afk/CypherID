# AI Anomaly Service

## Language
Python 3.11

## Framework
FastAPI

## Port
8090

## Responsibilities
- Consume access-logs Kafka topic
- Extract features from access log events
- Run Isolation Forest inference
- POST anomaly alerts to Java backend

## Key Files
```
backend/ai-anomaly-service/
├── main.py          — FastAPI app + Kafka consumer thread
├── model.py         — Feature extraction + Isolation Forest
├── consumer.py      — Kafka consumer
├── alerter.py       — HTTP client to Java backend
├── feature_store.py — Redis-backed sliding window feature store
├── model/
│   └── isolation_forest.pkl  — Pre-trained model
└── requirements.txt
```

## Model Training
Trained OFFLINE on REAL access log data (never synthetic).
Training script: `backend/ai-service/train.py` — consumes the `access-logs` Kafka
topic (or a JSONL export of real events), builds the feature matrix with the same
`FeatureExtractor` used at inference, and persists `model/isolation_forest.pkl`.

The service refuses to start without a trained model (no fabricated data).
Retrain periodically on recent production access logs to counter model drift.
