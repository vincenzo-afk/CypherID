package com.cypherid.access.service.service;

import com.cypherid.access.service.domain.MultiSigRequestEntity;
import com.cypherid.access.service.dto.MultiSigCreateRequest;
import com.cypherid.access.service.dto.MultiSigResponse;
import com.cypherid.access.service.exception.FabricUnavailableException;
import com.cypherid.access.service.exception.ResourceNotFoundException;
import com.cypherid.access.service.fabric.FabricAccessClient;
import com.cypherid.access.service.repository.MultiSigRequestRepository;
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
 * MultiSigService — orchestrates multi-signature approval flows
 * (docs/access-control/11_MULTI_SIGNATURE_APPROVAL.md).
 * <p>
 * Classified resources require approvals from multiple admins before access
 * is granted. Every approval is recorded on-chain with approver DID,
 * signature, and timestamp.
 */
@Service
@Transactional
public class MultiSigService {

    private static final Logger logger = LoggerFactory.getLogger(MultiSigService.class);

    private static final Type STRING_LIST_TYPE = new TypeToken<List<String>>() {}.getType();
    private static final Type STRING_MAP_TYPE  = new TypeToken<Map<String, String>>() {}.getType();

    private final FabricAccessClient fabricClient;
    private final MultiSigRequestRepository repository;
    private final Gson gson = new Gson();

    public MultiSigService(FabricAccessClient fabricClient,
                           MultiSigRequestRepository repository) {
        this.fabricClient = fabricClient;
        this.repository = repository;
    }

    /**
     * Creates a multi-sig approval request on-chain.
     */
    public MultiSigResponse create(String requesterDid, MultiSigCreateRequest request) {
        String requestId = UUID.randomUUID().toString();
        String approversJson = gson.toJson(request.requiredApprovers());
        String nonce = FabricAccessClient.generateNonce();
        String timestamp = Instant.now().toString();

        try {
            fabricClient.createMultiSigRequest(requestId, request.resourceId(), requesterDid,
                    approversJson, nonce, timestamp);
        } catch (GatewayException e) {
            throw new FabricUnavailableException("Blockchain network unavailable", e);
        } catch (Exception e) {
            throw new RuntimeException("MultiSig request creation failed: " + e.getMessage(), e);
        }

        MultiSigRequestEntity entity = new MultiSigRequestEntity();
        entity.setRequestId(requestId);
        entity.setResourceId(request.resourceId());
        entity.setRequesterDid(requesterDid);
        entity.setRequiredApprovers(approversJson);
        entity.setRequiredThreshold(request.requiredApprovers().size());
        entity.setApprovals("[]");
        entity.setStatus("PENDING");
        repository.save(entity);

        logger.info("MultiSig request created: {} for resource: {} by {}",
                requestId, request.resourceId(), requesterDid);

        return toResponse(entity);
    }

    /**
     * Records an approver's approval on-chain.
     */
    public MultiSigResponse approve(String requestId, String approverDid, String signature) {
        String nonce = FabricAccessClient.generateNonce();
        String timestamp = Instant.now().toString();

        String resultJson;
        try {
            FabricAccessClient.TxOutcome outcome = fabricClient.approveMultiSig(
                    requestId, approverDid, signature, nonce, timestamp);
            resultJson = outcome.payloadUtf8();
        } catch (GatewayException e) {
            throw new FabricUnavailableException("Blockchain network unavailable", e);
        } catch (Exception e) {
            throw new RuntimeException("Approval failed: " + e.getMessage(), e);
        }

        // Chaincode returns: {"requestId":..., "status":..., "approvalCount":N}
        Map<String, String> result = gson.fromJson(resultJson, STRING_MAP_TYPE);

        MultiSigRequestEntity entity = repository.findByRequestId(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("MULTISIG_NOT_FOUND",
                        "MultiSig request not found: " + requestId));

        entity.setStatus(result.getOrDefault("status", entity.getStatus()));
        entity.setApprovals(appendApproval(entity.getApprovals(),
                approverDid, signature, timestamp));
        repository.save(entity);

        logger.info("MultiSig approval recorded: {} by {} (status: {})",
                requestId, approverDid, entity.getStatus());

        return toResponse(entity);
    }

    private String appendApproval(String approvalsJson, String approverDid, String signature, String timestamp) {
        List<MultiSigResponse.Approval> approvals = approvalsJson == null || approvalsJson.isBlank()
                ? new java.util.ArrayList<>()
                : gson.fromJson(approvalsJson, new TypeToken<List<MultiSigResponse.Approval>>() {}.getType());
        approvals.add(new MultiSigResponse.Approval(approverDid, signature, timestamp));
        return gson.toJson(approvals);
    }

    private MultiSigResponse toResponse(MultiSigRequestEntity e) {
        List<String> approvers = e.getRequiredApprovers() == null || e.getRequiredApprovers().isBlank()
                ? List.of()
                : gson.fromJson(e.getRequiredApprovers(), STRING_LIST_TYPE);
        List<MultiSigResponse.Approval> approvals = e.getApprovals() == null || e.getApprovals().isBlank()
                ? List.of()
                : gson.fromJson(e.getApprovals(), new TypeToken<List<MultiSigResponse.Approval>>() {}.getType());

        return new MultiSigResponse(
                e.getRequestId(), e.getResourceId(), e.getRequesterDid(),
                approvers, e.getRequiredThreshold(), approvals, e.getStatus(),
                e.getCreatedAt().toString(), e.getUpdatedAt().toString());
    }
}