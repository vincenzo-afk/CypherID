# CypherID AI Anomaly Detection Service (docs/ai/01_AI_ARCHITECTURE.md)
# Runs as container ai-svc on port 8090.
FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (better layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application code
COPY app/ ./app/
COPY train.py ./
COPY model/ ./model/

# The model is NOT generated here: mount/COPY a model trained on real access-log
# data (see model/README.md). The service refuses to start without one.
EXPOSE 8090

ENV PYTHONUNBUFFERED=1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8090"]