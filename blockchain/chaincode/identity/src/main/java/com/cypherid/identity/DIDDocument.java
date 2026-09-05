package com.cypherid.identity;

import com.google.gson.annotations.SerializedName;

/**
 * DIDDocument — on-chain representation of a Decentralized Identifier document.
 * Stored as JSON under key DID:{did} in Fabric world state.
 *
 * Follows W3C DID Core spec subset for SIH demo.
 */
public class DIDDocument {

    @SerializedName("did")
    private String did;

    @SerializedName("publicKey")
    private String publicKey;

    @SerializedName("metadata")
    private String metadata;

    /** ACTIVE | SUSPENDED | REVOKED */
    @SerializedName("status")
    private String status;

    @SerializedName("createdAt")
    private String createdAt;

    @SerializedName("updatedAt")
    private String updatedAt;

    @SerializedName("version")
    private int version;

    // ─── Builder ──────────────────────────────────────────────────────────────

    private DIDDocument() {}

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private final DIDDocument doc = new DIDDocument();

        public Builder did(String did)             { doc.did = did; return this; }
        public Builder publicKey(String pk)        { doc.publicKey = pk; return this; }
        public Builder metadata(String m)          { doc.metadata = m; return this; }
        public Builder status(String s)            { doc.status = s; return this; }
        public Builder createdAt(String ts)        { doc.createdAt = ts; return this; }
        public Builder updatedAt(String ts)        { doc.updatedAt = ts; return this; }
        public Builder version(int v)              { doc.version = v; return this; }

        public DIDDocument build() {
            if (doc.did == null || doc.did.isBlank()) throw new IllegalStateException("DID is required");
            if (doc.publicKey == null || doc.publicKey.isBlank()) throw new IllegalStateException("publicKey is required");
            if (doc.status == null) doc.status = "ACTIVE";
            if (doc.version < 1) doc.version = 1;
            return doc;
        }
    }

    // ─── Getters ──────────────────────────────────────────────────────────────

    public String getDid()        { return did; }
    public String getPublicKey()  { return publicKey; }
    public String getMetadata()   { return metadata; }
    public String getStatus()     { return status; }
    public String getCreatedAt()  { return createdAt; }
    public String getUpdatedAt()  { return updatedAt; }
    public int    getVersion()    { return version; }

    @Override
    public String toString() {
        return "DIDDocument{did='" + did + "', status='" + status + "', version=" + version + "}";
    }
}
