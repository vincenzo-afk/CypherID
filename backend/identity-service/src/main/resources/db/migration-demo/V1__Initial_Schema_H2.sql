-- CypherID H2 Demo Schema

CREATE TABLE IF NOT EXISTS users (
    id              UUID            PRIMARY KEY,
    did             VARCHAR(255)    UNIQUE NOT NULL,
    password_hash   VARCHAR(255)    NOT NULL,
    organization    VARCHAR(100)    NOT NULL,
    department      VARCHAR(100),
    clearance_level VARCHAR(50)     DEFAULT 'UNCLASSIFIED',
    status          VARCHAR(20)     NOT NULL DEFAULT 'ACTIVE',
    fabric_cert     VARCHAR(65535),
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_did ON users(did);
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
