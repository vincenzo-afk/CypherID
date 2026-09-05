package com.cypherid.access.service.domain;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

/**
 * AccessPolicyEntity — local mirror of an on-chain AccessPolicy.
 * <p>
 * The ledger remains the source of truth; this table exists to serve
 * GET /api/v1/access/policies endpoints (docs/api/08_POLICY_APIS.md).
 */
@Entity
@Table(name = "access_policies")
public class AccessPolicyEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "policy_id", nullable = false, unique = true, length = 255)
    private String policyId;

    @Column(name = "resource_id", nullable = false, length = 255)
    private String resourceId;

    @Column(name = "required_role", length = 100)
    private String requiredRole;

    /** JSON string of required ABAC attributes, e.g. {"dept":"DRDO"} */
    @Column(name = "abac_attributes", length = 2000)
    private String abacAttributes;

    /** READ | WRITE | DELETE | ADMIN */
    @Column(nullable = false, length = 50)
    private String action;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_by", nullable = false, length = 255)
    private String createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    public void onUpdate() { this.updatedAt = Instant.now(); }

    // ─── Getters / Setters ────────────────────────────────────────────────────

    public UUID getId()                { return id; }
    public String getPolicyId()        { return policyId; }
    public String getResourceId()      { return resourceId; }
    public String getRequiredRole()    { return requiredRole; }
    public String getAbacAttributes()  { return abacAttributes; }
    public String getAction()          { return action; }
    public boolean isActive()          { return active; }
    public String getCreatedBy()       { return createdBy; }
    public Instant getCreatedAt()      { return createdAt; }
    public Instant getUpdatedAt()      { return updatedAt; }

    public void setPolicyId(String v)        { this.policyId = v; }
    public void setResourceId(String v)      { this.resourceId = v; }
    public void setRequiredRole(String v)    { this.requiredRole = v; }
    public void setAbacAttributes(String v)  { this.abacAttributes = v; }
    public void setAction(String v)          { this.action = v; }
    public void setActive(boolean v)         { this.active = v; }
    public void setCreatedBy(String v)       { this.createdBy = v; }
    public void setCreatedAt(Instant v)      { this.createdAt = v; }
    public void setUpdatedAt(Instant v)      { this.updatedAt = v; }
}