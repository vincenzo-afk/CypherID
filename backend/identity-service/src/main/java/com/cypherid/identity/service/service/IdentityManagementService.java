package com.cypherid.identity.service.service;

import com.cypherid.identity.service.crypto.DIDKeyService;
import com.cypherid.identity.service.domain.User;
import com.cypherid.identity.service.dto.*;
import com.cypherid.identity.service.fabric.FabricGatewayClient;
import com.cypherid.identity.service.repository.UserRepository;
import com.google.gson.Gson;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.KeyPair;
import java.time.Instant;
import java.util.Map;

/**
 * IdentityManagementService — orchestrates DID lifecycle operations.
 * <p>
 * Each operation:
 * 1. Performs local validation
 * 2. Calls Fabric chaincode via FabricGatewayClient
 * 3. Persists metadata to PostgreSQL
 * 4. Returns result including blockchain transaction hash
 */
@Service
@Transactional
public class IdentityManagementService {

    private static final Logger logger = LoggerFactory.getLogger(IdentityManagementService.class);

    private static final String ADMIN_DID = "did:cypherid:admin:root";
    private static final String TEMP_PASSWORD = "CypherID@2026!"; // Default initial password, user should change

    private final FabricGatewayClient fabricClient;
    private final DIDKeyService didKeyService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final Gson gson = new Gson();

    public IdentityManagementService(FabricGatewayClient fabricClient,
                                      DIDKeyService didKeyService,
                                      UserRepository userRepository,
                                      PasswordEncoder passwordEncoder) {
        this.fabricClient    = fabricClient;
        this.didKeyService   = didKeyService;
        this.userRepository  = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Creates a new DID for a user.
     * Flow:
     * 1. Generate EC key pair
     * 2. Derive DID from public key
     * 3. Submit createDID to Fabric
     * 4. Persist user to PostgreSQL
     * 5. Return DID + didDocument + txHash + privateKey (one-time delivery)
     */
    public CreateDIDResponse createDID(CreateDIDRequest request) {
        try {
            // 1. Generate key pair
            KeyPair keyPair = didKeyService.generateKeyPair();
            String encodedPublicKey = didKeyService.encodePublicKey(keyPair.getPublic());
            String encodedPrivateKey = didKeyService.encodePrivateKey(keyPair.getPrivate());

            // 2. Derive DID
            String did = didKeyService.deriveDID(keyPair.getPublic());

            // Check DID doesn't already exist locally
            if (userRepository.existsByDid(did)) {
                throw new RuntimeException("DID collision detected: " + did);
            }

            // 3. Build metadata JSON
            String metadata = gson.toJson(Map.of(
                    "org", request.organization(),
                    "dept", request.department() != null ? request.department() : "",
                    "kyc", request.kycData()
            ));

            // 4. Submit to Fabric
            String nonce = FabricGatewayClient.generateNonce();
            String timestamp = Instant.now().toString();

            FabricGatewayClient.TxOutcome outcome = fabricClient.createDID(
                    did, encodedPublicKey, metadata, nonce, timestamp);
            String didDocumentJson = outcome.payloadUtf8();
            String txHash = outcome.txId();  // real on-chain transaction ID

            // 5. Persist to PostgreSQL
            User user = new User();
            user.setDid(did);
            user.setPasswordHash(passwordEncoder.encode(TEMP_PASSWORD));
            user.setOrganization(request.organization());
            user.setDepartment(request.department());
            user.setClearanceLevel("UNCLASSIFIED");
            user.setStatus("ACTIVE");
            userRepository.save(user);

            logger.info("DID created successfully: {} for org: {}", did, request.organization());

            return new CreateDIDResponse(did, didDocumentJson, txHash, encodedPrivateKey);

        } catch (Exception e) {
            logger.error("DID creation failed: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to create DID: " + e.getMessage(), e);
        }
    }

    /**
     * Resolves a DID from the blockchain.
     */
    @Transactional(readOnly = true)
    public ResolveDIDResponse resolveDID(String did) {
        try {
            String didDocJson = fabricClient.resolveDID(did);
            return new ResolveDIDResponse(
                    didDocJson,
                    extractStatus(didDocJson),
                    Instant.now().toString());
        } catch (Exception e) {
            logger.error("DID resolution failed for {}: {}", did, e.getMessage());
            throw new RuntimeException("DID not found: " + did);
        }
    }

    /**
     * Suspends a DID on-chain and updates local status.
     */
    public TxHashResponse suspendDID(String did, String adminDid, String reason) {
        try {
            String nonce     = FabricGatewayClient.generateNonce();
            String timestamp = Instant.now().toString();

            FabricGatewayClient.TxOutcome outcome = fabricClient.suspendDID(did, adminDid, reason, nonce, timestamp);
            String txHash = outcome.txId();  // real on-chain transaction ID

            // Update local status
            userRepository.findByDid(did).ifPresent(user -> {
                user.setStatus("SUSPENDED");
                userRepository.save(user);
            });
            logger.info("DID suspended: {} by admin: {}", did, adminDid);
            return new TxHashResponse(txHash, "SUSPENDED");

        } catch (Exception e) {
            throw new RuntimeException("Failed to suspend DID: " + e.getMessage(), e);
        }
    }

    /**
     * Revokes a DID permanently on-chain.
     */
    public TxHashResponse revokeDID(String did, String adminDid, String reason) {
        try {
            String nonce     = FabricGatewayClient.generateNonce();
            String timestamp = Instant.now().toString();

            FabricGatewayClient.TxOutcome outcome = fabricClient.revokeDID(did, adminDid, reason, nonce, timestamp);
            String txHash = outcome.txId();  // real on-chain transaction ID

            // Update local status
            userRepository.findByDid(did).ifPresent(user -> {
                user.setStatus("REVOKED");
                userRepository.save(user);
            });
            logger.info("DID revoked: {} by admin: {}", did, adminDid);
            return new TxHashResponse(txHash, "REVOKED");

        } catch (Exception e) {
            throw new RuntimeException("Failed to revoke DID: " + e.getMessage(), e);
        }
    }

    /**
     * Lists DIDs by status (delegates to Fabric chaincode query).
     */
    @Transactional(readOnly = true)
    public String listDIDs(String status) {
        try {
            return fabricClient.resolveDID("__LIST__" + (status != null ? status : "ALL"));
        } catch (Exception e) {
            // Fallback to local DB query
            return gson.toJson(userRepository.findAll().stream()
                    .filter(u -> status == null || status.equals(u.getStatus()))
                    .map(u -> Map.of("did", u.getDid(), "status", u.getStatus(), "org", u.getOrganization()))
                    .toList());
        }
    }

    private String extractStatus(String didDocJson) {
        // Simple JSON extraction without full parse
        if (didDocJson.contains("\"ACTIVE\"")) return "ACTIVE";
        if (didDocJson.contains("\"SUSPENDED\"")) return "SUSPENDED";
        if (didDocJson.contains("\"REVOKED\"")) return "REVOKED";
        return "UNKNOWN";
    }
}
