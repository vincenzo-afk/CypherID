package com.cypherid.access;

import com.google.gson.annotations.SerializedName;
import java.util.List;

/**
 * MultiSigRequest — on-chain record for multi-signature approval flows.
 * Stored under MULTISIG:{requestId}
 */
public class MultiSigRequest {

    @SerializedName("requestId")
    private String requestId;

    @SerializedName("resourceId")
    private String resourceId;

    @SerializedName("requesterDid")
    private String requesterDid;

    @SerializedName("requiredApprovers")
    private List<String> requiredApprovers;

    @SerializedName("approvals")
    private List<ApprovalRecord> approvals;

    @SerializedName("requiredThreshold")
    private int requiredThreshold;

    /** PENDING | APPROVED | REJECTED | EXPIRED */
    @SerializedName("status")
    private String status;

    @SerializedName("createdAt")
    private String createdAt;

    @SerializedName("updatedAt")
    private String updatedAt;

    public record ApprovalRecord(
        @SerializedName("approverDid") String approverDid,
        @SerializedName("signature")   String signature,
        @SerializedName("timestamp")   String timestamp
    ) {}

    private MultiSigRequest() {}

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private final MultiSigRequest r = new MultiSigRequest();

        public Builder requestId(String v)               { r.requestId = v; return this; }
        public Builder resourceId(String v)              { r.resourceId = v; return this; }
        public Builder requesterDid(String v)            { r.requesterDid = v; return this; }
        public Builder requiredApprovers(List<String> v) { r.requiredApprovers = v; r.requiredThreshold = v.size(); return this; }
        public Builder approvals(List<ApprovalRecord> v) { r.approvals = v; return this; }
        public Builder status(String v)                  { r.status = v; return this; }
        public Builder createdAt(String v)               { r.createdAt = v; return this; }
        public Builder updatedAt(String v)               { r.updatedAt = v; return this; }

        public MultiSigRequest build() {
            if (r.requestId == null)  throw new IllegalStateException("requestId required");
            if (r.status == null) r.status = "PENDING";
            return r;
        }
    }

    public String getRequestId()               { return requestId; }
    public String getResourceId()              { return resourceId; }
    public String getRequesterDid()            { return requesterDid; }
    public List<String> getRequiredApprovers() { return requiredApprovers; }
    public List<ApprovalRecord> getApprovals() { return approvals; }
    public int getRequiredThreshold()          { return requiredThreshold; }
    public String getStatus()                  { return status; }
    public String getCreatedAt()               { return createdAt; }
    public String getUpdatedAt()               { return updatedAt; }

    public void setStatus(String status)       { this.status = status; }
    public void setUpdatedAt(String ts)        { this.updatedAt = ts; }
}
