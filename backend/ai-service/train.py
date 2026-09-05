"""Offline training for the Isolation Forest anomaly detection model.

Trains the model on REAL access-log data — never synthetic data. Two sources:

  Kafka replay:
    python train.py --kafka-bootstrap localhost:9092 --topic access-logs \\
                    --output model/isolation_forest.pkl

  JSONL file (exported real access events, one JSON object per line):
    python train.py --input access_events.jsonl --output model/isolation_forest.pkl

Each event must contain at least: did, decision, timestamp (ISO-8601).
Additional fields (classification) enrich the features when present.
"""
import argparse
import json
import logging
import pickle

import numpy as np
from sklearn.ensemble import IsolationForest

from app.features import FeatureExtractor

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)


def load_events_from_kafka(bootstrap: str, topic: str, timeout_seconds: int = 60) -> list:
    """Consumes historical messages from the topic (auto_offset_reset=earliest)."""
    from kafka import KafkaConsumer

    consumer = KafkaConsumer(
        topic,
        bootstrap_servers=bootstrap,
        auto_offset_reset="earliest",
        enable_auto_commit=False,
        consumer_timeout_ms=timeout_seconds * 1000,
        value_deserializer=lambda raw: json.loads(raw.decode("utf-8")),
    )
    events = []
    try:
        for message in consumer:
            if isinstance(message.value, dict) and message.value.get("eventType") == "ACCESS_LOG":
                events.append(message.value)
    finally:
        consumer.close()
    logger.info("Consumed %d access-log events from topic %s", len(events), topic)
    return events


def load_events_from_jsonl(path: str) -> list:
    events = []
    with open(path, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            event = json.loads(line)
            if isinstance(event, dict) and event.get("eventType") == "ACCESS_LOG":
                events.append(event)
    logger.info("Loaded %d access-log events from %s", len(events), path)
    return events


def build_feature_matrix(events: list) -> np.ndarray:
    """Builds the feature matrix using the same extractor used at inference."""
    extractor = FeatureExtractor()
    for event in events:
        extractor.ingest(event)
    return np.asarray([extractor.features(event) for event in events], dtype=float)


def main() -> None:
    parser = argparse.ArgumentParser(description="Train Isolation Forest on real access logs")
    src = parser.add_mutually_exclusive_group(required=True)
    src.add_argument("--kafka-bootstrap", help="Kafka bootstrap servers, e.g. localhost:9092")
    src.add_argument("--input", help="JSONL file of real access-log events")
    parser.add_argument("--topic", default="access-logs")
    parser.add_argument("--output", default="model/isolation_forest.pkl")
    parser.add_argument("--contamination", type=float, default=0.05)
    parser.add_argument("--n-estimators", type=int, default=100)
    parser.add_argument("--min-events", type=int, default=100,
                        help="refuse to train on fewer real events than this")
    args = parser.parse_args()

    events = (load_events_from_kafka(args.kafka_bootstrap, args.topic)
              if args.kafka_bootstrap else load_events_from_jsonl(args.input))

    if len(events) < args.min_events:
        raise SystemExit(
            f"Only {len(events)} real events available; refusing to train a model on "
            f"fewer than {args.min_events} (no synthetic augmentation). "
            "Collect more production access logs first.")

    X = build_feature_matrix(events)
    logger.info("Training IsolationForest on %d real samples (contamination=%.2f)",
                len(X), args.contamination)
    model = IsolationForest(n_estimators=args.n_estimators,
                            contamination=args.contamination,
                            random_state=42)
    model.fit(X)

    import os
    os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)
    with open(args.output, "wb") as fh:
        pickle.dump(model, fh)
    logger.info("Model saved to %s", args.output)


if __name__ == "__main__":
    main()