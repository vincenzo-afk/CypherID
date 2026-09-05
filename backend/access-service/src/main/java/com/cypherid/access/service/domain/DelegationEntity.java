package com.cypherid.access.service.domain;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

/**
 * DelegationEntity — local mirror of an on-chain delegation record.
 * <p>
 * The ledger remains the source of truth; this table supports audit queries.
 */
@Entity
@Table(name = "delegations")
public class DelegationEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "from_did", nullable = false, length = 255)
    private String fromDid;

    @Column(name = "to_did", nullable = false, length = 255)
    private String toDid;

    @Column(name = "resource_id", nullable = false, length = 255)
    private String resourceId;

    @Column(nullable = false, length = 50)
    private String action;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    // ─── Getters / Setters ────────────────────────────────────────────────────

    public UUID getId()          { return id; }
    public String getFromDid()   { return fromDid; }
    public String getToDid()     { return toDid; }
    public String getResourceId(){ return resourceId; }
    public String getAction()    { return action; }
    public Instant getExpiresAt(){ return expiresAt; }
    public boolean isActive()    { return active; }
    public Instant getCreatedAt(){ return createdAt; }

    public void setFromDid(String v)     { this.fromDid = v; }
    public void setToDid(String v)       { this.toDid = v; }
    public void setResourceId(String v)  { this.resourceId = v; }
    public void setAction(String v)      { this.action = v; }
    public void setExpiresAt(Instant v)  { this.expiresAt = v; }
    public void setActive(boolean v)     { this.active = v; }
    public void setCreatedAt(Instant v)  { this.createdAt = v; }
}