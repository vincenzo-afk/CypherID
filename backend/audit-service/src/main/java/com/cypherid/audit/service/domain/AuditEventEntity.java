package com.cypherid.audit.service.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/**
 * AuditEventEntity — tamper-evident mirror of audit-relevant events.
 * The Fabric ledger is authoritative; this table serves filtered queries
 * and PDF reports (docs/backend/06_AUDIT_SERVICE.md).
 */
@Entity
@Table(name = "audit_events")
public class AuditEventEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "event_type", nullable = false, length = 100)
    private String eventType;

    @Column(length = 255)
    private String did;

    @Column(name = "resource_id", length = 255)
    private String resourceId;

    @Column(length = 50)
    private String action;

    @Column(length = 20)
    private String decision;

    @Column(length = 1000)
    private String reason;

    @Column(name = "tx_hash", length = 255)
    private String txHash;

    @Column(name = "event_time", nullable = false)
    private Instant eventTime = Instant.now();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public UUID getId() { return id; }
    public String getEventType() { return eventType; }
    public String getDid() { return did; }
    public String getResourceId() { return resourceId; }
    public String getAction() { return action; }
    public String getDecision() { return decision; }
    public String getReason() { return reason; }
    public String getTxHash() { return txHash; }
    public Instant getEventTime() { return eventTime; }
    public Instant getCreatedAt() { return createdAt; }

    public void setEventType(String v) { this.eventType = v; }
    public void setDid(String v) { this.did = v; }
    public void setResourceId(String v) { this.resourceId = v; }
    public void setAction(String v) { this.action = v; }
    public void setDecision(String v) { this.decision = v; }
    public void setReason(String v) { this.reason = v; }
    public void setTxHash(String v) { this.txHash = v; }
    public void setEventTime(Instant v) { this.eventTime = v; }
}
