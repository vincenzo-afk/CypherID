package com.cypherid.access;

import com.google.gson.annotations.SerializedName;

/**
 * AccessLog — immutable on-chain record of every access decision.
 * Stored under ACCESS_LOG:{txId}
 */
public class AccessLog {

    @SerializedName("logId")
    private String logId;

    @SerializedName("did")
    private String did;

    @SerializedName("resourceId")
    private String resourceId;

    @SerializedName("action")
    private String action;

    /** GRANTED | DENIED */
    @SerializedName("decision")
    private String decision;

    @SerializedName("reason")
    private String reason;

    @SerializedName("policyId")
    private String policyId;

    @SerializedName("timestamp")
    private String timestamp;

    @SerializedName("contextAttributes")
    private String contextAttributes;

    private AccessLog() {}

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private final AccessLog l = new AccessLog();

        public Builder logId(String v)              { l.logId = v; return this; }
        public Builder did(String v)                { l.did = v; return this; }
        public Builder resourceId(String v)         { l.resourceId = v; return this; }
        public Builder action(String v)             { l.action = v; return this; }
        public Builder decision(String v)           { l.decision = v; return this; }
        public Builder reason(String v)             { l.reason = v; return this; }
        public Builder policyId(String v)           { l.policyId = v; return this; }
        public Builder timestamp(String v)          { l.timestamp = v; return this; }
        public Builder contextAttributes(String v)  { l.contextAttributes = v; return this; }

        public AccessLog build() {
            if (l.did == null)        throw new IllegalStateException("did required");
            if (l.resourceId == null) throw new IllegalStateException("resourceId required");
            if (l.decision == null)   throw new IllegalStateException("decision required");
            return l;
        }
    }

    public String getLogId()             { return logId; }
    public String getDid()               { return did; }
    public String getResourceId()        { return resourceId; }
    public String getAction()            { return action; }
    public String getDecision()          { return decision; }
    public String getReason()            { return reason; }
    public String getPolicyId()          { return policyId; }
    public String getTimestamp()         { return timestamp; }
    public String getContextAttributes() { return contextAttributes; }
}
