# CypherID AI Anomaly Detection Service (docs/ai/01_AI_ARCHITECTURE.md)
# Runs as container ai-svc on port 8090.
FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (better layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application code
COPY app/ ./app/
COPY model/ ./model/

# Model is trained on synthetic data at startup if model/isolation_forest.pkl is absent
EXPOSE 8090

ENV PYTHONUNBUFFERED=1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8090"]