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
Model is pre-trained on synthetic access log data for demo.
Real deployment requires training on production access patterns.
