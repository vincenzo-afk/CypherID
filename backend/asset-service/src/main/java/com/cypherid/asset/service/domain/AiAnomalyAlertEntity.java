package com.cypherid.asset.service.domain;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * AiAnomalyAlertEntity — persisted AI anomaly alert
 * (docs/ai/, table ai_anomaly_alerts in docs/data/02_POSTGRESQL_MODEL.md).
 */
@Entity
@Table(name = "ai_anomaly_alerts")
public class AiAnomalyAlertEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_did", nullable = false, length = 255)
    private String userDid;

    @Column(name = "anomaly_score", nullable = false, precision = 10, scale = 6)
    private BigDecimal anomalyScore;

    /** JSON string of the feature vector */
    @Column(nullable = false, length = 4000)
    private String features;

    @Column(name = "pattern_description", length = 500)
    private String patternDescription;

    @Column(name = "blockchain_tx_hash", length = 255)
    private String blockchainTxHash;

    @Column(nullable = false)
    private boolean acknowledged = false;

    @Column(name = "acknowledged_by", length = 255)
    private String acknowledgedBy;

    @Column(name = "acknowledged_at")
    private Instant acknowledgedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    // ─── Getters / Setters ────────────────────────────────────────────────────

    public UUID getId()                  { return id; }
    public String getUserDid()           { return userDid; }
    public BigDecimal getAnomalyScore()  { return anomalyScore; }
    public String getFeatures()          { return features; }
    public String getPatternDescription(){ return patternDescription; }
    public String getBlockchainTxHash()  { return blockchainTxHash; }
    public boolean isAcknowledged()      { return acknowledged; }
    public String getAcknowledgedBy()    { return acknowledgedBy; }
    public Instant getAcknowledgedAt()   { return acknowledgedAt; }
    public Instant getCreatedAt()        { return createdAt; }

    public void setUserDid(String v)            { this.userDid = v; }
    public void setAnomalyScore(BigDecimal v)   { this.anomalyScore = v; }
    public void setFeatures(String v)           { this.features = v; }
    public void setPatternDescription(String v) { this.patternDescription = v; }
    public void setBlockchainTxHash(String v)   { this.blockchainTxHash = v; }
    public void setAcknowledged(boolean v)      { this.acknowledged = v; }
    public void setAcknowledgedBy(String v)     { this.acknowledgedBy = v; }
    public void setAcknowledgedAt(Instant v)    { this.acknowledgedAt = v; }
    public void setCreatedAt(Instant v)         { this.createdAt = v; }
}