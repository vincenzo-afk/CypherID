-- CypherID Audit Service PostgreSQL Schema
-- Migration V1: tamper-evident audit event store (docs/backend/06_AUDIT_SERVICE.md).
-- The Hyperledger Fabric ledger remains the authoritative audit trail; this table
-- mirrors Kafka-consumed events for fast filtered queries and PDF reporting.

CREATE TABLE IF NOT EXISTS audit_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type      VARCHAR(100)  NOT NULL,   -- ACCESS_DECISION, SECURITY_ALERT, IDENTITY_EVENT, ASSET_EVENT, PROTECTION_EVENT
    did             VARCHAR(255),
    resource_id     VARCHAR(255),
    action          VARCHAR(50),
    decision        VARCHAR(20),                -- GRANTED, DENIED, INFO
    reason          VARCHAR(1000),
    tx_hash         VARCHAR(255),
    event_time      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_did ON audit_events(did);
CREATE INDEX IF NOT EXISTS idx_audit_events_resource ON audit_events(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_decision ON audit_events(decision);
CREATE INDEX IF NOT EXISTS idx_audit_events_time ON audit_events(event_time DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_type ON audit_events(event_type);
