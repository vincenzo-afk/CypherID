package com.cypherid.asset.service.domain;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

/**
 * SecurityEventEntity — persisted security event
 * (docs/backend/13_SECURITY_EVENT_SERVICE.md).
 */
@Entity
@Table(name = "security_events")
public class SecurityEventEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "session_id")
    private UUID sessionId;

    @Column(name = "user_did", length = 255)
    private String userDid;

    @Column(name = "event_type", nullable = false, length = 50)
    private String eventType;

    /** JSON string of event metadata */
    @Column(name = "event_data", length = 4000)
    private String eventData;

    /** LOW | MEDIUM | HIGH | CRITICAL */
    @Column(nullable = false, length = 20)
    private String severity;

    @Column(name = "blockchain_tx_hash", length = 255)
    private String blockchainTxHash;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    // ─── Getters / Setters ────────────────────────────────────────────────────

    public UUID getId()               { return id; }
    public UUID getSessionId()        { return sessionId; }
    public String getUserDid()        { return userDid; }
    public String getEventType()      { return eventType; }
    public String getEventData()      { return eventData; }
    public String getSeverity()       { return severity; }
    public String getBlockchainTxHash(){ return blockchainTxHash; }
    public Instant getCreatedAt()     { return createdAt; }

    public void setSessionId(UUID v)         { this.sessionId = v; }
    public void setUserDid(String v)         { this.userDid = v; }
    public void setEventType(String v)       { this.eventType = v; }
    public void setEventData(String v)       { this.eventData = v; }
    public void setSeverity(String v)        { this.severity = v; }
    public void setBlockchainTxHash(String v){ this.blockchainTxHash = v; }
    public void setCreatedAt(Instant v)      { this.createdAt = v; }
}