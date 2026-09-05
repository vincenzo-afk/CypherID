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

## Model Training (Demo)
Pre-trained on synthetic access log data.
Training script: `train_model.py` (not in production path).
Real deployment: retrain on 30 days of production access logs.
