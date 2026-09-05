-- CypherID Asset Service PostgreSQL Schema
-- Migration V2: Protected session infrastructure
-- (docs/data/11_PROTECTED_SESSION_DATA_MODEL.md).
-- Redis holds hot session state; these tables provide the audit mirror.

-- Protected sessions (audit mirror of the Redis hot state)
CREATE TABLE IF NOT EXISTS protected_sessions (
    id                  UUID         PRIMARY KEY,
    user_did            VARCHAR(255) NOT NULL,
    content_id          VARCHAR(255) NOT NULL,
    content_type        VARCHAR(20)  NOT NULL,   -- DOCUMENT | EXAM | VIDEO
    protection_profile  VARCHAR(20)  NOT NULL,   -- LOW | MEDIUM | HIGH | EXTREME
    session_seed        BYTEA        NOT NULL,   -- renderer seed (never the encryption key)
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

-- Session watermarks (docs/protection/watermark/02_SESSION_WATERMARK.md)
CREATE TABLE IF NOT EXISTS watermarks (
    id              UUID         PRIMARY KEY,
    session_id      UUID         NOT NULL,
    display_id      VARCHAR(20)  NOT NULL,
    user_display    VARCHAR(20)  NOT NULL,
    content_id      VARCHAR(255) NOT NULL,
    timestamp_label VARCHAR(30)  NOT NULL,
    random_token    VARCHAR(20)  NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_watermarks_session_id ON watermarks(session_id);
CREATE INDEX IF NOT EXISTS idx_watermarks_display_id ON watermarks(display_id);

-- Security events (docs/backend/13_SECURITY_EVENT_SERVICE.md)
CREATE TABLE IF NOT EXISTS security_events (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id          UUID,
    user_did            VARCHAR(255),
    event_type          VARCHAR(50)  NOT NULL,
    event_data          TEXT,                    -- JSON metadata
    severity            VARCHAR(20)  NOT NULL,   -- LOW | MEDIUM | HIGH | CRITICAL
    blockchain_tx_hash  VARCHAR(255),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_events_user_did ON security_events(user_did);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at DESC);