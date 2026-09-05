"""CypherID AI Anomaly Detection Service (docs/ai/01_AI_ARCHITECTURE.md).

FastAPI microservice (port 8090, container name ai-svc):
- GET  /health                     → liveness
- GET  /api/anomaly/threshold      → current threshold policy
- POST /api/anomaly/evaluate       → score a feature vector (diagnostics)

The Kafka consumer runs as a background thread within this process.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from . import config
from .consumer import AccessLogConsumerThread
from .features import FEATURE_NAMES, FeatureExtractor
from .model import ModelManager

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

extractor = FeatureExtractor(window_seconds=config.WINDOW_SECONDS)
model = ModelManager(
    model_path=config.MODEL_PATH,
    contamination=config.CONTAMINATION,
    n_estimators=config.N_ESTIMATORS,
    threshold=config.AI_ANOMALY_THRESHOLD,
)
consumer_thread = AccessLogConsumerThread(extractor, model)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    logger.info("AI service starting (threshold=%.3f, model=%s)",
                config.AI_ANOMALY_THRESHOLD, config.MODEL_PATH)
    consumer_thread.start()
    yield
    consumer_thread.stop()
    logger.info("AI service stopped")


app = FastAPI(title="CypherID AI Anomaly Detection", version="1.0.0", lifespan=lifespan)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "ai-svc", "port": config.PORT}


@app.get("/api/anomaly/threshold")
def threshold() -> dict:
    return {
        "threshold": config.AI_ANOMALY_THRESHOLD,
        "contamination": config.CONTAMINATION,
        "featureNames": FEATURE_NAMES,
    }


@app.post("/api/anomaly/evaluate")
def evaluate(payload: dict) -> dict:
    """Diagnostic endpoint: score an arbitrary feature vector.

    Payload: {"features": [hour, day, access_1min, access_10min, denied_10min, classification]}
    """
    features = [float(x) for x in payload.get("features", [])]
    score = model.score(features)
    return {
        "score": score,
        "isAnomaly": model.is_anomaly(score),
        "threshold": config.AI_ANOMALY_THRESHOLD,
    }