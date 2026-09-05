package com.cypherid.identity.service.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/**
 * User JPA entity — local account mapped to a Fabric DID.
 * The password_hash is used for initial authentication only.
 * The DID is the canonical identity used across all blockchain operations.
 */
@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(nullable = false, updatable = false)
    private UUID id;

    /**
     * Decentralized Identifier — primary identity key.
     * Format: did:cypherid:0x{hex}
     */
    @Column(nullable = false, unique = true, length = 255)
    private String did;

    /** BCrypt hashed password */
    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    /** Organization: BEL | DRDO | MoD (docs/blockchain/03_ORGANIZATIONS.md) */
    @Column(nullable = false, length = 100)
    private String organization;

    @Column(length = 100)
    private String department;

    /**
     * Security clearance level, must match on-chain RBAC role.
     * UNCLASSIFIED | CONFIDENTIAL | SECRET | TOP_SECRET
     */
    @Column(name = "clearance_level", length = 50)
    private String clearanceLevel = "UNCLASSIFIED";

    /** ACTIVE | SUSPENDED | REVOKED */
    @Column(nullable = false, length = 20)
    private String status = "ACTIVE";

    /** PEM-encoded Fabric CA enrollment certificate */
    @Column(name = "fabric_cert", columnDefinition = "TEXT")
    private String fabricCert;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    public void onUpdate() { this.updatedAt = Instant.now(); }

    // ─── Getters / Setters ────────────────────────────────────────────────────

    public UUID getId()             { return id; }
    public String getDid()          { return did; }
    public String getPasswordHash() { return passwordHash; }
    public String getOrganization() { return organization; }
    public String getDepartment()   { return department; }
    public String getClearanceLevel() { return clearanceLevel; }
    public String getStatus()       { return status; }
    public String getFabricCert()   { return fabricCert; }
    public Instant getCreatedAt()   { return createdAt; }
    public Instant getUpdatedAt()   { return updatedAt; }

    public void setDid(String did)                  { this.did = did; }
    public void setPasswordHash(String h)           { this.passwordHash = h; }
    public void setOrganization(String o)           { this.organization = o; }
    public void setDepartment(String d)             { this.department = d; }
    public void setClearanceLevel(String c)         { this.clearanceLevel = c; }
    public void setStatus(String s)                 { this.status = s; }
    public void setFabricCert(String cert)          { this.fabricCert = cert; }
    public void setUpdatedAt(Instant ts)            { this.updatedAt = ts; }

    @Override
    public String toString() {
        return "User{did='" + did + "', org='" + organization + "', status='" + status + "'}";
    }
}
