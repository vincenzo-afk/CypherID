CREATE TABLE IF NOT EXISTS audit_events (
    id              UUID PRIMARY KEY,
    event_type      VARCHAR(100)  NOT NULL,
    did             VARCHAR(255),
    resource_id     VARCHAR(255),
    action          VARCHAR(50),
    decision        VARCHAR(20),
    reason          VARCHAR(1000),
    tx_hash         VARCHAR(255),
    event_time      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ae_did ON audit_events(did);
CREATE INDEX IF NOT EXISTS idx_ae_resource ON audit_events(resource_id);
CREATE INDEX IF NOT EXISTS idx_ae_time ON audit_events(event_time DESC);
