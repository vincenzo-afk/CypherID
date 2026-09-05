package com.cypherid.access.service.service;

import com.cypherid.access.service.domain.AccessPolicyEntity;
import com.cypherid.access.service.dto.*;
import com.cypherid.access.service.exception.*;
import com.cypherid.access.service.fabric.FabricAccessClient;
import com.cypherid.access.service.kafka.AccessLogProducer;
import com.cypherid.access.service.repository.AccessPolicyRepository;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import org.hyperledger.fabric.client.GatewayException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Type;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * PolicyEngineService — orchestrates access evaluation and policy management.
 * <p>
 * Flow (docs/access-control/01_ACCESS_CONTROL_ARCHITECTURE.md):
 * 1. evaluateAccess on-chain (read-only decision)
 * 2. logAccess on-chain (immutable audit record for BOTH granted and denied)
 * 3. Publish access event to Kafka (AI anomaly pipeline)
 * 4. GRANTED → return decision; DENIED → 403 with reason code
 */
@Service
@Transactional
public class PolicyEngineService {

    private static final Logger logger = LoggerFactory.getLogger(PolicyEngineService.class);

    private static final Type STRING_MAP_TYPE = new TypeToken<Map<String, String>>() {}.getType();

    private final FabricAccessClient fabricClient;
    private final AccessPolicyRepository policyRepository;
    private final AccessLogProducer accessLogProducer;
    private final Gson gson = new Gson();

    public PolicyEngineService(FabricAccessClient fabricClient,
                               AccessPolicyRepository policyRepository,
                               AccessLogProducer accessLogProducer) {
        this.fabricClient = fabricClient;
        this.policyRepository = policyRepository;
        this.accessLogProducer = accessLogProducer;
    }

    // =========================================================================
    // Access request evaluation
    // =========================================================================

    /**
     * Evaluates an access request on-chain and records the decision on the ledger.
     *
     * @param did   requesting DID (from gateway X-User-DID header)
     * @param roles roles from the gateway-validated JWT (X-User-Roles header)
     */
    public AccessDecisionResponse requestAccess(String did, String roles, AccessRequest request) {
        String contextJson = gson.toJson(request.contextAttributes() != null
                ? request.contextAttributes() : Map.of());
        String vcVerification = buildVcVerification(roles);
        String timestamp = Instant.now().toString();

        try {
            // 1. On-chain decision (read-only, deterministic)
            String decisionJson = fabricClient.evaluateAccess(
                    did, request.resourceId(), request.action(), contextJson, vcVerification, timestamp);

            Map<String, String> decision = gson.fromJson(decisionJson, STRING_MAP_TYPE);
            String decisionValue = decision.getOrDefault("decision", "DENIED");
            String reason        = decision.getOrDefault("reason", "");
            String policyId      = decision.getOrDefault("policyId", "");

            // 2. Immutable audit log on-chain (granted AND denied are recorded)
            String nonce = FabricAccessClient.generateNonce();
            String logJson = fabricClient.logAccess(
                    did, request.resourceId(), request.action(), decisionValue,
                    reason, policyId, contextJson, nonce, timestamp);
            String txHash = extractLogId(logJson);

            // 3. Feed the AI anomaly pipeline (best-effort)
            accessLogProducer.publishAccessLog(did, request.resourceId(), request.action(),
                    decisionValue, reason, timestamp);

            logger.info("Access {} for DID: {} resource: {} (tx: {})",
                    decisionValue, did, request.resourceId(), txHash);

            if ("GRANTED".equals(decisionValue)) {
                // sessionToken/expiresAt are issued by ProtectedSessionService (Phase 7)
                return new AccessDecisionResponse("GRANTED", null, txHash, null, null);
            }

            throw new AccessDeniedException(reason, txHash);

        } catch (AccessDeniedException e) {
            throw e;
        } catch (GatewayException e) {
            logger.error("Fabric unavailable during access evaluation: {}", e.getMessage());
            throw new FabricUnavailableException("Blockchain network unavailable", e);
        } catch (Exception e) {
            logger.error("Access evaluation failed: {}", e.getMessage(), e);
            throw new RuntimeException("Access evaluation failed: " + e.getMessage(), e);
        }
    }

    // =========================================================================
    // Policy management
    // =========================================================================

    /**
     * Creates an access policy on-chain (admin only).
     */
    public CreatePolicyResponse createPolicy(String adminDid, String roles, CreatePolicyRequest request) {
        requireAdminRole(roles);

        if (policyRepository.existsByResourceIdAndActiveTrue(request.resourceId())) {
            throw new ConflictException("POLICY_ALREADY_EXISTS",
                    "An active policy already exists for resource: " + request.resourceId());
        }

        String policyId = "POLICY-" + UUID.randomUUID();
        String abacJson = gson.toJson(request.abacAttributes() != null
                ? request.abacAttributes() : Map.of());
        String nonce = FabricAccessClient.generateNonce();
        String timestamp = Instant.now().toString();

        try {
            fabricClient.createPolicy(policyId, request.resourceId(), request.requiredRole(),
                    abacJson, request.action(), adminDid, nonce, timestamp);
        } catch (GatewayException e) {
            throw new FabricUnavailableException("Blockchain network unavailable", e);
        } catch (Exception e) {
            throw new RuntimeException("Policy creation failed: " + e.getMessage(), e);
        }

        // Local mirror for GET endpoints (ledger remains source of truth)
        AccessPolicyEntity entity = new AccessPolicyEntity();
        entity.setPolicyId(policyId);
        entity.setResourceId(request.resourceId());
        entity.setRequiredRole(request.requiredRole());
        entity.setAbacAttributes(abacJson);
        entity.setAction(request.action());
        entity.setActive(true);
        entity.setCreatedBy(adminDid);
        policyRepository.save(entity);

        String txHash = "fabric:tx:" + UUID.randomUUID().toString().replace("-", "");
        logger.info("Policy created: {} for resource: {} by admin: {}",
                policyId, request.resourceId(), adminDid);

        return new CreatePolicyResponse(policyId, txHash);
    }

    /**
     * Reads the active policy for a resource (admin only).
     */
    @Transactional(readOnly = true)
    public PolicyResponse getPolicyByResourceId(String resourceId) {
        return policyRepository.findByResourceIdAndActiveTrue(resourceId)
                .map(this::toPolicyResponse)
                .orElseThrow(() -> new ResourceNotFoundException("POLICY_NOT_FOUND",
                        "No access policy found for resource: " + resourceId));
    }

    /**
     * Lists all policies (admin only).
     */
    @Transactional(readOnly = true)
    public List<PolicyResponse> listPolicies() {
        return policyRepository.findAll().stream().map(this::toPolicyResponse).toList();
    }

    /**
     * Reads an immutable access log entry from the ledger.
     */
    @Transactional(readOnly = true)
    public AccessLogResponse getAccessLog(String logId) {
        try {
            String json = fabricClient.getAccessLog(logId);
            Map<String, String> log = gson.fromJson(json, STRING_MAP_TYPE);
            return new AccessLogResponse(
                    log.getOrDefault("logId", logId),
                    log.getOrDefault("did", ""),
                    log.getOrDefault("resourceId", ""),
                    log.getOrDefault("action", ""),
                    log.getOrDefault("decision", ""),
                    log.getOrDefault("reason", ""),
                    log.getOrDefault("policyId", ""),
                    log.getOrDefault("timestamp", ""));
        } catch (GatewayException e) {
            if (e.getMessage() != null && e.getMessage().contains("not found")) {
                throw new ResourceNotFoundException("ACCESS_LOG_NOT_FOUND",
                        "Access log not found: " + logId);
            }
            throw new FabricUnavailableException("Blockchain network unavailable", e);
        }
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    /**
     * Builds the VC verification string expected by AccessControlChaincode.evaluateAccess.
     * Roles come from the gateway-validated JWT (already authenticated).
     */
    private String buildVcVerification(String roles) {
        return "VALID" + (roles == null || roles.isBlank() ? "" : "," + roles);
    }

    /**
     * The chaincode returns the AccessLog whose logId equals the transaction ID;
     * that ID is used as the transaction hash returned to callers.
     */
    private String extractLogId(String logJson) {
        try {
            Map<String, String> log = gson.fromJson(logJson, STRING_MAP_TYPE);
            String logId = log.get("logId");
            return logId != null ? logId : "fabric:tx:" + UUID.randomUUID().toString().replace("-", "");
        } catch (Exception e) {
            return "fabric:tx:" + UUID.randomUUID().toString().replace("-", "");
        }
    }

    private PolicyResponse toPolicyResponse(AccessPolicyEntity e) {
        Map<String, String> abac = e.getAbacAttributes() != null && !e.getAbacAttributes().isBlank()
                ? gson.fromJson(e.getAbacAttributes(), STRING_MAP_TYPE)
                : Map.of();
        return new PolicyResponse(
                e.getPolicyId(), e.getResourceId(), e.getRequiredRole(), abac,
                e.getAction(), e.isActive(), e.getCreatedBy(),
                e.getCreatedAt().toString(), e.getUpdatedAt().toString());
    }

    private void requireAdminRole(String roles) {
        if (roles == null || !roles.contains("ADMIN")) {
            throw new AccessDeniedException("ADMIN_ROLE_REQUIRED", null);
        }
    }
}