-- CypherID Asset Service PostgreSQL Schema
-- Migration V3: AI anomaly alerts (docs/ai/).
-- The AI anomaly detection service posts alerts here via POST /api/security/ai-alert.

CREATE TABLE IF NOT EXISTS ai_anomaly_alerts (
    id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_did             VARCHAR(255)  NOT NULL,
    anomaly_score        DECIMAL(10,6) NOT NULL,
    features             TEXT          NOT NULL,   -- JSON feature vector
    pattern_description  VARCHAR(500),
    blockchain_tx_hash   VARCHAR(255),
    acknowledged         BOOLEAN       NOT NULL DEFAULT FALSE,
    acknowledged_by      VARCHAR(255),
    acknowledged_at      TIMESTAMPTZ,
    created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_anomaly_alerts_user_did ON ai_anomaly_alerts(user_did);
CREATE INDEX IF NOT EXISTS idx_ai_anomaly_alerts_created_at ON ai_anomaly_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_anomaly_alerts_acknowledged ON ai_anomaly_alerts(acknowledged);