package com.cypherid.asset.service.domain;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

/**
 * ProtectedSessionEntity — PostgreSQL audit mirror of a protected session
 * (docs/data/11_PROTECTED_SESSION_DATA_MODEL.md). Redis is the hot state
 * store; this table records the full session lifecycle for audit.
 */
@Entity
@Table(name = "protected_sessions")
public class ProtectedSessionEntity {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_did", nullable = false, length = 255)
    private String userDid;

    @Column(name = "content_id", nullable = false, length = 255)
    private String contentId;

    @Column(name = "content_type", nullable = false, length = 20)
    private String contentType;   // DOCUMENT | EXAM | VIDEO

    @Column(name = "protection_profile", nullable = false, length = 20)
    private String protectionProfile; // LOW | MEDIUM | HIGH | EXTREME

    /** Random per-session seed used by the renderer (never the encryption key). */
    @Column(name = "session_seed", nullable = false)
    private byte[] sessionSeed;

    @Column(name = "watermark_id", nullable = false)
    private UUID watermarkId;

    @Column(nullable = false, length = 30)
    private String state;         // AUTHORIZED | PROTECTED_VIEW | ... | EXPIRED

    @Column(name = "issued_at", nullable = false)
    private Instant issuedAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "chunk_count", nullable = false)
    private int chunkCount;

    @Column(name = "last_chunk_at")
    private Instant lastChunkAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    // ─── Getters / Setters ────────────────────────────────────────────────────

    public UUID getId()               { return id; }
    public String getUserDid()        { return userDid; }
    public String getContentId()      { return contentId; }
    public String getContentType()    { return contentType; }
    public String getProtectionProfile() { return protectionProfile; }
    public byte[] getSessionSeed()    { return sessionSeed; }
    public UUID getWatermarkId()      { return watermarkId; }
    public String getState()          { return state; }
    public Instant getIssuedAt()      { return issuedAt; }
    public Instant getExpiresAt()     { return expiresAt; }
    public Instant getClosedAt()      { return closedAt; }
    public int getChunkCount()        { return chunkCount; }
    public Instant getLastChunkAt()   { return lastChunkAt; }
    public Instant getCreatedAt()     { return createdAt; }

    public void setId(UUID v)               { this.id = v; }
    public void setUserDid(String v)        { this.userDid = v; }
    public void setContentId(String v)      { this.contentId = v; }
    public void setContentType(String v)    { this.contentType = v; }
    public void setProtectionProfile(String v) { this.protectionProfile = v; }
    public void setSessionSeed(byte[] v)    { this.sessionSeed = v; }
    public void setWatermarkId(UUID v)      { this.watermarkId = v; }
    public void setState(String v)          { this.state = v; }
    public void setIssuedAt(Instant v)      { this.issuedAt = v; }
    public void setExpiresAt(Instant v)     { this.expiresAt = v; }
    public void setClosedAt(Instant v)      { this.closedAt = v; }
    public void setChunkCount(int v)        { this.chunkCount = v; }
    public void setLastChunkAt(Instant v)   { this.lastChunkAt = v; }
}