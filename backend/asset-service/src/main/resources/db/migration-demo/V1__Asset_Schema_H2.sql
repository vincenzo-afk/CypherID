CREATE TABLE IF NOT EXISTS asset_encryption_keys (
    asset_id        VARCHAR(255) PRIMARY KEY,
    encrypted_key   VARBINARY(1024) NOT NULL,
    iv              VARBINARY(1024) NOT NULL,
    algorithm       VARCHAR(20)  NOT NULL DEFAULT 'AES_256_GCM',
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
