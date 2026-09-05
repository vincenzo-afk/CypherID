-- CypherID Asset Service PostgreSQL Schema
-- Migration V1: Per-asset encryption keys (wrapped with the master key).
-- The Hyperledger Fabric ledger is the source of truth for asset metadata,
-- ownership, and provenance; this table stores the keys needed to decrypt
-- asset content server-side (docs/assets/13_ENCRYPTED_STORAGE.md).

CREATE TABLE IF NOT EXISTS asset_encryption_keys (
    asset_id        VARCHAR(255) PRIMARY KEY,
    encrypted_key   BYTEA        NOT NULL,   -- AES-256 key encrypted with master key
    iv              BYTEA        NOT NULL,   -- IV for the master-key encryption
    algorithm       VARCHAR(20)  NOT NULL DEFAULT 'AES_256_GCM',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asset_encryption_keys_created_at
    ON asset_encryption_keys(created_at DESC);