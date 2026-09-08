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

-- NOTE: protected_sessions / watermarks / security_events / asset_encryption_keys
-- are owned by asset-service (see backend/asset-service/.../db/migration/V1__Asset_Schema.sql
-- and V2__Protected_Session_Schema.sql), which is where ProtectedSessionService and
-- ProtectedContentService actually live (docs/AGENTS.md "Key Distribution" section).
-- They do not belong here — identity-service has no code that reads or writes them.
