package com.cypherid.access.service.domain;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

/**
 * MultiSigRequestEntity — local mirror of an on-chain MultiSigRequest.
 * <p>
 * The ledger remains the source of truth; this table supports audit queries.
 */
@Entity
@Table(name = "multi_sig_requests")
public class MultiSigRequestEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "request_id", nullable = false, unique = true, length = 255)
    private String requestId;

    @Column(name = "resource_id", nullable = false, length = 255)
    private String resourceId;

    @Column(name = "requester_did", nullable = false, length = 255)
    private String requesterDid;

    /** JSON array of approver DIDs */
    @Column(name = "required_approvers", nullable = false, length = 2000)
    private String requiredApprovers;

    @Column(name = "required_threshold", nullable = false)
    private int requiredThreshold;

    /** JSON array of ApprovalRecord objects */
    @Column(nullable = false, length = 4000)
    private String approvals = "[]";

    /** PENDING | APPROVED */
    @Column(nullable = false, length = 20)
    private String status = "PENDING";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    public void onUpdate() { this.updatedAt = Instant.now(); }

    // ─── Getters / Setters ────────────────────────────────────────────────────

    public UUID getId()                  { return id; }
    public String getRequestId()         { return requestId; }
    public String getResourceId()        { return resourceId; }
    public String getRequesterDid()      { return requesterDid; }
    public String getRequiredApprovers() { return requiredApprovers; }
    public int getRequiredThreshold()    { return requiredThreshold; }
    public String getApprovals()         { return approvals; }
    public String getStatus()            { return status; }
    public Instant getCreatedAt()        { return createdAt; }
    public Instant getUpdatedAt()        { return updatedAt; }

    public void setRequestId(String v)         { this.requestId = v; }
    public void setResourceId(String v)        { this.resourceId = v; }
    public void setRequesterDid(String v)      { this.requesterDid = v; }
    public void setRequiredApprovers(String v) { this.requiredApprovers = v; }
    public void setRequiredThreshold(int v)    { this.requiredThreshold = v; }
    public void setApprovals(String v)         { this.approvals = v; }
    public void setStatus(String v)            { this.status = v; }
    public void setCreatedAt(Instant v)        { this.createdAt = v; }
    public void setUpdatedAt(Instant v)        { this.updatedAt = v; }
}