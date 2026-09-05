package com.cypherid.asset.service.domain;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

/**
 * WatermarkEntity — persisted session watermark record
 * (docs/protection/watermark/02_SESSION_WATERMARK.md).
 * The full DID is NOT stored in the watermark itself; forensic lookup
 * maps displayId → session → DID and requires admin access.
 */
@Entity
@Table(name = "watermarks")
public class WatermarkEntity {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "session_id", nullable = false)
    private UUID sessionId;

    @Column(name = "display_id", nullable = false, length = 20)
    private String displayId;

    @Column(name = "user_display", nullable = false, length = 20)
    private String userDisplay;

    @Column(name = "content_id", nullable = false, length = 255)
    private String contentId;

    @Column(name = "timestamp_label", nullable = false, length = 30)
    private String timestampLabel;

    @Column(name = "random_token", nullable = false, length = 20)
    private String randomToken;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    // ─── Getters / Setters ────────────────────────────────────────────────────

    public UUID getId()             { return id; }
    public UUID getSessionId()      { return sessionId; }
    public String getDisplayId()    { return displayId; }
    public String getUserDisplay()  { return userDisplay; }
    public String getContentId()    { return contentId; }
    public String getTimestampLabel(){ return timestampLabel; }
    public String getRandomToken()  { return randomToken; }
    public Instant getCreatedAt()   { return createdAt; }

    public void setId(UUID v)             { this.id = v; }
    public void setSessionId(UUID v)      { this.sessionId = v; }
    public void setDisplayId(String v)    { this.displayId = v; }
    public void setUserDisplay(String v)  { this.userDisplay = v; }
    public void setContentId(String v)    { this.contentId = v; }
    public void setTimestampLabel(String v) { this.timestampLabel = v; }
    public void setRandomToken(String v)  { this.randomToken = v; }
    public void setCreatedAt(Instant v)   { this.createdAt = v; }
}