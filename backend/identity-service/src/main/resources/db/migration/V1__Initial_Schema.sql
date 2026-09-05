-- CypherID PostgreSQL Schema
-- Migration V1: Initial schema creation

-- Users table: stores DID-to-local account mapping
CREATE TABLE IF NOT EXISTS users (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    did             VARCHAR(255)    UNIQUE NOT NULL,
    password_hash   VARCHAR(255)    NOT NULL,
    organization    VARCHAR(100)    NOT NULL,
    department      VARCHAR(100),
    clearance_level VARCHAR(50)     DEFAULT 'UNCLASSIFIED',
    status          VARCHAR(20)     NOT NULL DEFAULT 'ACTIVE',
    fabric_cert     TEXT,           -- Fabric CA enrollment certificate (PEM)
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_did ON users(did);
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Protected sessions
CREATE TABLE IF NOT EXISTS protected_sessions (
    id                  UUID        PRIMARY KEY,
    user_did            VARCHAR(255) NOT NULL,
    content_id          VARCHAR(255) NOT NULL,
    content_type        VARCHAR(20)  NOT NULL,   -- DOCUMENT | EXAM | VIDEO
    protection_profile  VARCHAR(20)  NOT NULL,   -- LOW | MEDIUM | HIGH | EXTREME
    session_seed        BYTEA        NOT NULL,
    watermark_id        UUID         NOT NULL,
    state               VARCHAR(30)  NOT NULL DEFAULT 'AUTHORIZED',
    issued_at           TIMESTAMPTZ  NOT NULL,
    expires_at          TIMESTAMPTZ  NOT NULL,
    closed_at           TIMESTAMPTZ,
    chunk_count         INTEGER      NOT NULL DEFAULT 0,
    last_chunk_at       TIMESTAMPTZ,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_protected_sessions_user_did ON protected_sessions(user_did);
CREATE INDEX IF NOT EXISTS idx_protected_sessions_content_id ON protected_sessions(content_id);
CREATE INDEX IF NOT EXISTS idx_protected_sessions_state ON protected_sessions(state);

-- Watermarks
CREATE TABLE IF NOT EXISTS watermarks (
    id              UUID        PRIMARY KEY,
    session_id      UUID        NOT NULL REFERENCES protected_sessions(id) ON DELETE CASCADE,
    display_id      VARCHAR(20) NOT NULL,
    user_display    VARCHAR(20) NOT NULL,
    content_id      VARCHAR(255) NOT NULL,
    timestamp_label VARCHAR(30) NOT NULL,
    random_token    VARCHAR(20) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_watermarks_session_id ON watermarks(session_id);

-- Security events
CREATE TABLE IF NOT EXISTS security_events (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id          UUID        REFERENCES protected_sessions(id),
    user_did            VARCHAR(255),
    event_type          VARCHAR(50)  NOT NULL,
    event_data          JSONB,
    severity            VARCHAR(20)  NOT NULL,   -- LOW | MEDIUM | HIGH | CRITICAL
    blockchain_tx_hash  VARCHAR(255),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_events_user_did ON security_events(user_did);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at DESC);

-- Asset encryption keys (master key encrypted AES keys)
CREATE TABLE IF NOT EXISTS asset_encryption_keys (
    asset_id        VARCHAR(255)    PRIMARY KEY,
    encrypted_key   BYTEA           NOT NULL,   -- AES-256 key encrypted with master key
    iv              BYTEA           NOT NULL,   -- IV for master key encryption
    algorithm       VARCHAR(20)     NOT NULL DEFAULT 'AES_256_GCM',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- AI anomaly alerts
CREATE TABLE IF NOT EXISTS ai_anomaly_alerts (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_did                VARCHAR(255) NOT NULL,
    anomaly_score           DECIMAL(10,6) NOT NULL,
    features                JSONB        NOT NULL,
    pattern_description     VARCHAR(500),
    blockchain_tx_hash      VARCHAR(255),
    acknowledged            BOOLEAN      NOT NULL DEFAULT FALSE,
    acknowledged_by         VARCHAR(255),
    acknowledged_at         TIMESTAMPTZ,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_anomaly_alerts_user_did ON ai_anomaly_alerts(user_did);
CREATE INDEX IF NOT EXISTS idx_ai_anomaly_alerts_created_at ON ai_anomaly_alerts(created_at DESC);
