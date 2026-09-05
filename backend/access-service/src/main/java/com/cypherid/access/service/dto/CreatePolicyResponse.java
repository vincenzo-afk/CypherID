package com.cypherid.access.service.dto;

/**
 * CreatePolicyResponse — response for POST /api/v1/access/policies.
 */
public record CreatePolicyResponse(String policyId, String txHash) {}