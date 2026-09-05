"""Kafka consumer pipeline (docs/ai/07_KAFKA_PIPELINE.md).

A background thread subscribes to the access-logs topic, extracts features,
scores them with the Isolation Forest model, and POSTs alerts to the Java
backend when the score falls below the threshold.
"""
import json
import logging
import threading

from kafka import KafkaConsumer

from . import config
from .alerting import describe_pattern, post_alert
from .features import FeatureExtractor
from .model import ModelManager

logger = logging.getLogger(__name__)


class AccessLogConsumerThread(threading.Thread):
    """Long-running Kafka consumer; runs as a daemon inside the FastAPI process."""

    def __init__(self, extractor: FeatureExtractor, model: ModelManager):
        super().__init__(name="access-logs-consumer", daemon=True)
        self.extractor = extractor
        self.model = model
        self._stop = threading.Event()

    def stop(self) -> None:
        self._stop.set()

    def run(self) -> None:
        logger.info("Starting Kafka consumer on topic %s (bootstrap %s)",
                    config.ACCESS_LOGS_TOPIC, config.KAFKA_BOOTSTRAP_SERVERS)
        try:
            consumer = KafkaConsumer(
                config.ACCESS_LOGS_TOPIC,
                bootstrap_servers=config.KAFKA_BOOTSTRAP_SERVERS,
                group_id=config.CONSUMER_GROUP_ID,
                auto_offset_reset="latest",
                value_deserializer=lambda raw: json.loads(raw.decode("utf-8")),
            )
        except Exception as exc:  # noqa: BLE001 - Kafka may be down at startup
            logger.error("Kafka consumer init failed: %s", exc)
            return

        try:
            for message in consumer:
                if self._stop.is_set():
                    break
                self._handle(message.value)
        except Exception as exc:  # noqa: BLE001 - keep the thread alive
            logger.error("Consumer error: %s", exc)
        finally:
            consumer.close()

    def _handle(self, event: dict) -> None:
        if not isinstance(event, dict) or event.get("eventType") != "ACCESS_LOG":
            return

        self.extractor.ingest(event)
        features = self.extractor.features(event)
        score = self.model.score(features)

        if self.model.is_anomaly(score):
            did = event.get("did", "unknown")
            pattern = describe_pattern(features)
            logger.warning("AI anomaly detected for %s (score=%.3f): %s", did, score, pattern)
            post_alert(did, score, features, pattern)