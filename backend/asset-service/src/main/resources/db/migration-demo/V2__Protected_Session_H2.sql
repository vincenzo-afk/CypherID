CREATE TABLE IF NOT EXISTS protected_sessions (
    id                  UUID         PRIMARY KEY,
    user_did            VARCHAR(255) NOT NULL,
    content_id          VARCHAR(255) NOT NULL,
    content_type        VARCHAR(20)  NOT NULL,
    protection_profile  VARCHAR(20)  NOT NULL,
    session_seed        VARBINARY(256) NOT NULL,
    watermark_id        UUID         NOT NULL,
    state               VARCHAR(30)  NOT NULL DEFAULT 'AUTHORIZED',
    issued_at           TIMESTAMP    NOT NULL,
    expires_at          TIMESTAMP    NOT NULL,
    closed_at           TIMESTAMP,
    chunk_count         INTEGER      NOT NULL DEFAULT 0,
    last_chunk_at       TIMESTAMP,
    created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS watermarks (
    id              UUID         PRIMARY KEY,
    session_id      UUID         NOT NULL,
    display_id      VARCHAR(20)  NOT NULL,
    user_display    VARCHAR(20)  NOT NULL,
    content_id      VARCHAR(255) NOT NULL,
    timestamp_label VARCHAR(30)  NOT NULL,
    random_token    VARCHAR(20)  NOT NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security_events (
    id                  UUID         PRIMARY KEY,
    session_id          UUID,
    user_did            VARCHAR(255),
    event_type          VARCHAR(50)  NOT NULL,
    event_data          VARCHAR(10000),
    severity            VARCHAR(20)  NOT NULL,
    blockchain_tx_hash  VARCHAR(255),
    created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
