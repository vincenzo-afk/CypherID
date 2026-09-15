package com.cypherid.identity;

import com.google.gson.annotations.SerializedName;
import org.hyperledger.fabric.contract.annotation.DataType;
import org.hyperledger.fabric.contract.annotation.Property;

/**
 * VerifiableCredential — on-chain record of an issued VC.
 * Stored under key VC:{subjectDid}:{vcId} in Fabric world state.
 *
 * The full VC JSON (W3C format) is stored off-chain; only the hash
 * and metadata are stored on-chain for tamper evidence.
 *
 * {@code @DataType}/{@code @Property} are REQUIRED (see DIDDocument).
 */
@DataType
public class VerifiableCredential {

    @Property
    @SerializedName("vcId")
    private String vcId;

    @Property
    @SerializedName("subjectDid")
    private String subjectDid;

    @Property
    @SerializedName("issuerDid")
    private String issuerDid;

    /**
     * The full W3C Verifiable Credential JSON.
     * Stored on-chain for the SIH demo; production systems
     * would store only the hash (vcJsonHash) off-chain.
     */
    @Property
    @SerializedName("vcJson")
    private String vcJson;

    /** Issuer's digital signature over vcJson */
    @Property
    @SerializedName("issuerSignature")
    private String issuerSignature;

    /** ACTIVE | REVOKED */
    @Property
    @SerializedName("status")
    private String status;

    @Property
    @SerializedName("issuedAt")
    private String issuedAt;

    @Property
    @SerializedName("updatedAt")
    private String updatedAt;

    // ─── Builder ──────────────────────────────────────────────────────────────

    private VerifiableCredential() {}

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private final VerifiableCredential vc = new VerifiableCredential();

        public Builder vcId(String id)              { vc.vcId = id; return this; }
        public Builder subjectDid(String d)         { vc.subjectDid = d; return this; }
        public Builder issuerDid(String d)          { vc.issuerDid = d; return this; }
        public Builder vcJson(String j)             { vc.vcJson = j; return this; }
        public Builder issuerSignature(String sig)  { vc.issuerSignature = sig; return this; }
        public Builder status(String s)             { vc.status = s; return this; }
        public Builder issuedAt(String ts)          { vc.issuedAt = ts; return this; }
        public Builder updatedAt(String ts)         { vc.updatedAt = ts; return this; }

        public VerifiableCredential build() {
            if (vc.vcId == null) throw new IllegalStateException("vcId required");
            if (vc.subjectDid == null) throw new IllegalStateException("subjectDid required");
            if (vc.issuerDid == null) throw new IllegalStateException("issuerDid required");
            if (vc.status == null) vc.status = "ACTIVE";
            return vc;
        }
    }

    // ─── Getters ──────────────────────────────────────────────────────────────

    public String getVcId()            { return vcId; }
    public String getSubjectDid()      { return subjectDid; }
    public String getIssuerDid()       { return issuerDid; }
    public String getVcJson()          { return vcJson; }
    public String getIssuerSignature() { return issuerSignature; }
    public String getStatus()          { return status; }
    public String getIssuedAt()        { return issuedAt; }
    public String getUpdatedAt()       { return updatedAt; }

    @Override
    public String toString() {
        return "VerifiableCredential{vcId='" + vcId + "', subjectDid='" + subjectDid + "', status='" + status + "'}";
    }
}
