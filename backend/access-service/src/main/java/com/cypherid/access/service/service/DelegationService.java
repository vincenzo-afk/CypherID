package com.cypherid.access.service.service;

import com.cypherid.access.service.domain.DelegationEntity;
import com.cypherid.access.service.dto.DelegationResponse;
import com.cypherid.access.service.exception.FabricUnavailableException;
import com.cypherid.access.service.fabric.FabricAccessClient;
import com.cypherid.access.service.repository.DelegationRepository;
import org.hyperledger.fabric.client.GatewayException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.format.DateTimeParseException;

/**
 * DelegationService — manages access delegation lifecycle
 * (docs/access-control/10_DELEGATED_ACCESS.md).
 * <p>
 * User A can delegate access to User B for a resource within A's own
 * permissions. Delegation is time-bound (expiresAt) and recorded on-chain.
 */
@Service
@Transactional
public class DelegationService {

    private static final Logger logger = LoggerFactory.getLogger(DelegationService.class);

    private final FabricAccessClient fabricClient;
    private final DelegationRepository delegationRepository;

    public DelegationService(FabricAccessClient fabricClient,
                             DelegationRepository delegationRepository) {
        this.fabricClient = fabricClient;
        this.delegationRepository = delegationRepository;
    }

    /**
     * Delegates access to another DID (within the delegator's own permissions).
     */
    public DelegationResponse delegate(String fromDid, String toDid, String resourceId,
                                       String action, String expiresAt) {
        Instant expiry = parseExpiry(expiresAt);
        if (!expiry.isAfter(Instant.now())) {
            throw new IllegalArgumentException("expiresAt must be in the future");
        }

        String nonce = FabricAccessClient.generateNonce();
        String timestamp = Instant.now().toString();

        try {
            fabricClient.delegateAccess(fromDid, toDid, resourceId, action, expiresAt, nonce, timestamp);
        } catch (GatewayException e) {
            throw new FabricUnavailableException("Blockchain network unavailable", e);
        } catch (Exception e) {
            throw new RuntimeException("Delegation failed: " + e.getMessage(), e);
        }

        DelegationEntity entity = new DelegationEntity();
        entity.setFromDid(fromDid);
        entity.setToDid(toDid);
        entity.setResourceId(resourceId);
        entity.setAction(action);
        entity.setExpiresAt(expiry);
        entity.setActive(true);
        delegationRepository.save(entity);

        logger.info("Access delegated from {} to {} for resource {}", fromDid, toDid, resourceId);
        return new DelegationResponse(fromDid, toDid, resourceId, action, expiresAt, "DELEGATED");
    }

    /**
     * Revokes a previously granted delegation.
     */
    public DelegationResponse revoke(String fromDid, String toDid, String resourceId) {
        String nonce = FabricAccessClient.generateNonce();
        String timestamp = Instant.now().toString();

        try {
            fabricClient.revokeDelegate(fromDid, toDid, resourceId, nonce, timestamp);
        } catch (GatewayException e) {
            throw new FabricUnavailableException("Blockchain network unavailable", e);
        } catch (Exception e) {
            throw new RuntimeException("Delegation revocation failed: " + e.getMessage(), e);
        }

        delegationRepository.findByFromDidAndToDidAndResourceIdAndActiveTrue(fromDid, toDid, resourceId)
                .ifPresent(d -> {
                    d.setActive(false);
                    delegationRepository.save(d);
                });

        logger.info("Delegation revoked from {} to {} for resource {}", fromDid, toDid, resourceId);
        return new DelegationResponse(fromDid, toDid, resourceId, null, null, "DELEGATION_REVOKED");
    }

    private Instant parseExpiry(String expiresAt) {
        try {
            return Instant.parse(expiresAt);
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("expiresAt must be a valid ISO-8601 timestamp");
        }
    }
}