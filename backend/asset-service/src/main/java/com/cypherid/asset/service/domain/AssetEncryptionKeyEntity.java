package com.cypherid.asset.service.domain;

import jakarta.persistence.*;

import java.time.Instant;

/**
 * AssetEncryptionKeyEntity — per-asset AES-256 key stored at rest,
 * encrypted with the master key (docs/assets/13_ENCRYPTED_STORAGE.md,
 * docs/data/02_POSTGRESQL_MODEL.md asset_encryption_keys table).
 */
@Entity
@Table(name = "asset_encryption_keys")
public class AssetEncryptionKeyEntity {

    @Id
    @Column(name = "asset_id", nullable = false, length = 255)
    private String assetId;

    /** Per-asset key encrypted with the master key */
    @Column(name = "encrypted_key", nullable = false)
    private byte[] encryptedKey;

    /** IV used for the master-key encryption */
    @Column(nullable = false)
    private byte[] iv;

    @Column(nullable = false, length = 20)
    private String algorithm = "AES_256_GCM";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    // ─── Getters / Setters ────────────────────────────────────────────────────

    public String getAssetId()        { return assetId; }
    public byte[] getEncryptedKey()   { return encryptedKey; }
    public byte[] getIv()             { return iv; }
    public String getAlgorithm()      { return algorithm; }
    public Instant getCreatedAt()     { return createdAt; }

    public void setAssetId(String v)       { this.assetId = v; }
    public void setEncryptedKey(byte[] v)  { this.encryptedKey = v; }
    public void setIv(byte[] v)            { this.iv = v; }
    public void setAlgorithm(String v)     { this.algorithm = v; }
    public void setCreatedAt(Instant v)    { this.createdAt = v; }
}