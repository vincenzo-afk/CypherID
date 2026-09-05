"""Environment-based configuration for the AI anomaly detection service.

All values can be overridden via environment variables (Docker Compose).
"""
import os


def env(key: str, default: str) -> str:
    return os.environ.get(key, default)


# Kafka
KAFKA_BOOTSTRAP_SERVERS = env("KAFKA_BOOTSTRAP", "localhost:9092")
ACCESS_LOGS_TOPIC = env("ACCESS_LOGS_TOPIC", "access-logs")
CONSUMER_GROUP_ID = env("AI_CONSUMER_GROUP", "ai-anomaly-detection")

# Model
MODEL_PATH = env("AI_MODEL_PATH", "model/isolation_forest.pkl")
CONTAMINATION = float(env("AI_CONTAMINATION", "0.05"))
N_ESTIMATORS = int(env("AI_N_ESTIMATORS", "100"))

# Threshold policy (docs/ai/06_THRESHOLD_POLICY.md)
# Isolation Forest: negative score = anomaly; more negative = more anomalous.
DEFAULT_THRESHOLD = -0.1
AI_ANOMALY_THRESHOLD = float(env("AI_ANOMALY_THRESHOLD", str(DEFAULT_THRESHOLD)))

# Alert pipeline (docs/ai/01_AI_ARCHITECTURE.md)
JAVA_BACKEND_URL = env("JAVA_BACKEND_URL", "http://localhost:8083")
ALERT_ENDPOINT = env("ALERT_ENDPOINT", "/api/security/ai-alert")
ALERT_TIMEOUT_SECONDS = float(env("ALERT_TIMEOUT_SECONDS", "5"))

# Service
PORT = int(env("AI_SERVICE_PORT", "8090"))

# Feature window (docs/ai/03_FEATURE_ENGINEERING.md)
WINDOW_SECONDS = 600  # 10-minute sliding window per user