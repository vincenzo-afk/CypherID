package com.cypherid.asset;

import com.google.gson.annotations.SerializedName;

/**
 * Asset — on-chain record of a digital asset (document/IP/license).
 * Stored under key ASSET:{assetId} in Fabric world state.
 *
 * The actual file content is stored encrypted on IPFS.
 * The ipfsHash here is the IPFS CID of the AES-256-GCM encrypted blob.
 */
public class Asset {

    @SerializedName("assetId")
    private String assetId;

    @SerializedName("ownerDid")
    private String ownerDid;

    /** IPFS CID of the AES-256-GCM encrypted file */
    @SerializedName("ipfsHash")
    private String ipfsHash;

    /** TOP_SECRET | SECRET | CONFIDENTIAL | UNCLASSIFIED */
    @SerializedName("classification")
    private String classification;

    /** Access policy ID bound to this asset */
    @SerializedName("policyId")
    private String policyId;

    /** ACTIVE | TRANSFERRED | BURNED */
    @SerializedName("status")
    private String status;

    @SerializedName("fileName")
    private String fileName;

    @SerializedName("fileType")
    private String fileType;

    @SerializedName("fileSizeBytes")
    private long fileSizeBytes;

    @SerializedName("createdAt")
    private String createdAt;

    @SerializedName("updatedAt")
    private String updatedAt;

    private Asset() {}

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private final Asset a = new Asset();

        public Builder assetId(String v)         { a.assetId = v; return this; }
        public Builder ownerDid(String v)        { a.ownerDid = v; return this; }
        public Builder ipfsHash(String v)        { a.ipfsHash = v; return this; }
        public Builder classification(String v)  { a.classification = v; return this; }
        public Builder policyId(String v)        { a.policyId = v; return this; }
        public Builder status(String v)          { a.status = v; return this; }
        public Builder fileName(String v)        { a.fileName = v; return this; }
        public Builder fileType(String v)        { a.fileType = v; return this; }
        public Builder fileSizeBytes(long v)     { a.fileSizeBytes = v; return this; }
        public Builder createdAt(String v)       { a.createdAt = v; return this; }
        public Builder updatedAt(String v)       { a.updatedAt = v; return this; }

        public Asset build() {
            if (a.assetId == null)        throw new IllegalStateException("assetId required");
            if (a.ownerDid == null)       throw new IllegalStateException("ownerDid required");
            if (a.ipfsHash == null)       throw new IllegalStateException("ipfsHash required");
            if (a.classification == null) throw new IllegalStateException("classification required");
            if (a.status == null) a.status = "ACTIVE";
            return a;
        }
    }

    public String getAssetId()        { return assetId; }
    public String getOwnerDid()       { return ownerDid; }
    public String getIpfsHash()       { return ipfsHash; }
    public String getClassification() { return classification; }
    public String getPolicyId()       { return policyId; }
    public String getStatus()         { return status; }
    public String getFileName()       { return fileName; }
    public String getFileType()       { return fileType; }
    public long   getFileSizeBytes()  { return fileSizeBytes; }
    public String getCreatedAt()      { return createdAt; }
    public String getUpdatedAt()      { return updatedAt; }

    // Mutable for ownership transfer
    public void setOwnerDid(String did)   { this.ownerDid = did; }
    public void setStatus(String status)  { this.status = status; }
    public void setUpdatedAt(String ts)   { this.updatedAt = ts; }

    @Override
    public String toString() {
        return "Asset{assetId='" + assetId + "', ownerDid='" + ownerDid + "', status='" + status + "', classification='" + classification + "'}";
    }
}
