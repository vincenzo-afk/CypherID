package com.cypherid.access;

import com.google.gson.annotations.SerializedName;
import java.util.Map;

/**
 * AccessPolicy — stored on-chain under POLICY:{policyId}
 * Defines who can access a resource with what role and ABAC attributes.
 */
public class AccessPolicy {

    @SerializedName("policyId")
    private String policyId;

    @SerializedName("resourceId")
    private String resourceId;

    @SerializedName("requiredRole")
    private String requiredRole;

    /** ABAC attribute requirements: e.g., {"dept":"DRDO","location":"HYD"} */
    @SerializedName("abacAttributes")
    private Map<String, String> abacAttributes;

    /** READ | WRITE | DELETE | ADMIN */
    @SerializedName("action")
    private String action;

    @SerializedName("active")
    private boolean active;

    @SerializedName("createdBy")
    private String createdBy;

    @SerializedName("createdAt")
    private String createdAt;

    @SerializedName("updatedAt")
    private String updatedAt;

    private AccessPolicy() {}

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private final AccessPolicy p = new AccessPolicy();

        public Builder policyId(String v)                          { p.policyId = v; return this; }
        public Builder resourceId(String v)                        { p.resourceId = v; return this; }
        public Builder requiredRole(String v)                      { p.requiredRole = v; return this; }
        public Builder abacAttributes(Map<String, String> v)       { p.abacAttributes = v; return this; }
        public Builder action(String v)                            { p.action = v; return this; }
        public Builder active(boolean v)                           { p.active = v; return this; }
        public Builder createdBy(String v)                         { p.createdBy = v; return this; }
        public Builder createdAt(String v)                         { p.createdAt = v; return this; }
        public Builder updatedAt(String v)                         { p.updatedAt = v; return this; }

        public AccessPolicy build() {
            if (p.policyId == null)   throw new IllegalStateException("policyId required");
            if (p.resourceId == null) throw new IllegalStateException("resourceId required");
            p.active = true;
            return p;
        }
    }

    public String getPolicyId()                  { return policyId; }
    public String getResourceId()                { return resourceId; }
    public String getRequiredRole()              { return requiredRole; }
    public Map<String, String> getAbacAttributes() { return abacAttributes; }
    public String getAction()                    { return action; }
    public boolean isActive()                    { return active; }
    public String getCreatedBy()                 { return createdBy; }
    public String getCreatedAt()                 { return createdAt; }
    public String getUpdatedAt()                 { return updatedAt; }
}
