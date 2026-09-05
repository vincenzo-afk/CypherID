# AI Architecture

## Overview
Python FastAPI microservice that consumes access log events from Kafka,
applies an Isolation Forest anomaly detection model, and publishes alerts
to the Java backend when anomaly scores exceed a threshold.

## Stack
- Python 3.11
- FastAPI (REST API for alert reception by Java backend)
- Kafka-Python (Kafka consumer)
- scikit-learn 1.x (Isolation Forest)
- pandas (feature engineering)

## Data Flow
```
Java Access Service
    → Kafka topic: access-logs
        → Python Kafka Consumer
            → Feature Extraction
                → Isolation Forest Inference
                    → Score > threshold?
                        YES → POST /api/security/ai-alert (Java SecurityEventService)
                                → SecurityEventService writes on-chain SecurityAlert
                        NO  → Discard
```

## Deployment
Python FastAPI runs as Docker container: `ai-svc` on port 8090.
Kafka consumer runs as background thread within the FastAPI process.

## Model Loading
Model loaded from disk at startup: `model/isolation_forest.pkl`
The model is trained OFFLINE on real access log data via `backend/ai-service/train.py`
(Kafka replay of the `access-logs` topic or a JSONL export). The service never
generates training data — it refuses to start without a trained model.
Periodic retraining on recent production access patterns is required.
