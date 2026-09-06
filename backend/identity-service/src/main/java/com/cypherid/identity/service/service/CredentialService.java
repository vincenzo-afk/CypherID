package com.cypherid.identity.service.service;

import com.cypherid.identity.service.dto.*;
import com.cypherid.identity.service.fabric.FabricGatewayClient;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import java.lang.reflect.Type;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * CredentialService — Verifiable Credential issuance, listing, revocation,
 * and verification (docs/api/04_CREDENTIAL_APIS.md).
 *
 * <p>On-chain the ledger stores only the SHA-256 hash of the VC
 * (see IdentityChaincode); full VC payloads are returned to the holder
 * at issuance and never persisted server-side beyond the Fabric state.
 */
@Service
public class CredentialService {

    private static final Logger logger = LoggerFactory.getLogger(CredentialService.class);
    private static final Type MAP_TYPE = new TypeToken<Map<String, Object>>() {}.getType();

    private final FabricGatewayClient fabricClient;
    private final Gson gson = new Gson();

    /** Local index of issued VC summaries (vcId → summary) for list endpoints. */
    private final Map<String, Map<String, Object>> vcIndex = new ConcurrentHashMap<>();

    public CredentialService(FabricGatewayClient fabricClient) {
        this.fabricClient = fabricClient;
    }

    /**
     * Issues a VC for a subject DID (org admin only — enforced by controller).
     */
    public IssueCredentialResponse issueCredential(String issuerDid, IssueCredentialRequest request) {
        String vcId = "vc:cypherid:" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        String issuanceDate = Instant.now().toString();
        String expirationDate = request.expirationDate() != null
                ? request.expirationDate()
                : Instant.now().plusSeconds(365L * 24 * 3600).toString();

        Map<String, Object> vc = Map.of(
                "@context", List.of("https://www.w3.org/2018/credentials/v1"),
                "id", vcId,
                "type", List.of("VerifiableCredential", request.credentialType()),
                "issuer", issuerDid,
                "issuanceDate", issuanceDate,
                "expirationDate", expirationDate,
                "credentialSubject", Map.of(
                        "id", request.subjectDID(),
                        "attributes", request.attributes()));

        String vcJson = gson.toJson(vc);
        String nonce = FabricGatewayClient.generateNonce();
        String timestamp = Instant.now().toString();

        try {
            FabricGatewayClient.TxOutcome outcome = fabricClient.issueVC(
                    request.subjectDID(), vcId, vcJson, issuerDid, "sig:" + issuerDid, nonce, timestamp);
            String txHash = outcome.txId();

            vcIndex.put(vcId, Map.of(
                    "vcId", vcId,
                    "type", request.credentialType(),
                    "subjectDID", request.subjectDID(),
                    "issuer", issuerDid,
                    "status", "ACTIVE",
                    "expiresAt", expirationDate,
                    "txHash", txHash));

            logger.info("VC issued: {} for {} by {}", vcId, request.subjectDID(), issuerDid);
            return new IssueCredentialResponse(vcId, vc, txHash);
        } catch (Exception e) {
            logger.error("VC issuance failed: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to issue credential: " + e.getMessage(), e);
        }
    }

    /**
     * Lists VCs for a DID (self or admin — enforced by controller).
     */
    public CredentialListResponse listCredentials(String did) {
        List<Map<String, Object>> creds = vcIndex.values().stream()
                .filter(v -> did.equals(v.get("subjectDID")))
                .toList();
        // Best-effort Fabric enrichment could go here; local index is the demo source.
        return new CredentialListResponse(creds);
    }

    /**
     * Revokes a VC (issuer org admin only — enforced by controller).
     */
    public TxHashResponse revokeCredential(String vcId, String issuerDid) {
        Map<String, Object> summary = vcIndex.get(vcId);
        if (summary == null) {
            throw new RuntimeException("VC not found: " + vcId);
        }
        String subjectDid = (String) summary.get("subjectDID");
        try {
            FabricGatewayClient.TxOutcome outcome = fabricClient.revokeVC(
                    subjectDid, vcId, issuerDid,
                    FabricGatewayClient.generateNonce(), Instant.now().toString());
            vcIndex.put(vcId, new java.util.HashMap<>(summary) {{ put("status", "REVOKED"); }});
            logger.info("VC revoked: {} by {}", vcId, issuerDid);
            return new TxHashResponse(outcome.txId(), "REVOKED");
        } catch (Exception e) {
            logger.error("VC revocation failed: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to revoke credential: " + e.getMessage(), e);
        }
    }

    /**
     * Verifies a presented VC against the on-chain registry.
     */
    @SuppressWarnings("unchecked")
    public VerifyCredentialResponse verifyCredential(VerifyCredentialRequest request) {
        Map<String, Object> vc = request.vc();
        Object id = vc.get("id");
        Object subject = vc.get("credentialSubject");
        if (id == null || subject == null) {
            return new VerifyCredentialResponse(false, "VC_MALFORMED");
        }
        String vcId = id.toString();
        String subjectDid = subject instanceof Map
                ? String.valueOf(((Map<String, Object>) subject).getOrDefault("id", ""))
                : "";

        // Expiry check first (fail fast, no Fabric round-trip needed)
        Object exp = vc.get("expirationDate");
        if (exp != null) {
            try {
                if (Instant.parse(exp.toString()).isBefore(Instant.now())) {
                    return new VerifyCredentialResponse(false, "VC_EXPIRED");
                }
            } catch (Exception ignored) {
                // Unparseable date → let chaincode decide
            }
        }

        // Local revocation check
        Map<String, Object> summary = vcIndex.get(vcId);
        if (summary != null && "REVOKED".equals(summary.get("status"))) {
            return new VerifyCredentialResponse(false, "VC_REVOKED");
        }

        try {
            String result = fabricClient.verifyVC(subjectDid, vcId);
            Map<String, Object> parsed = gson.fromJson(result, MAP_TYPE);
            Object valid = parsed.get("valid");
            boolean ok = Boolean.TRUE.equals(valid) || "true".equalsIgnoreCase(String.valueOf(valid));
            String reason = ok ? null : String.valueOf(parsed.getOrDefault("reason", "VC_NOT_FOUND"));
            return new VerifyCredentialResponse(ok, reason);
        } catch (Exception e) {
            logger.warn("VC on-chain verification unavailable, falling back to local index: {}", e.getMessage());
            // Fallback: valid iff locally known and ACTIVE and not expired
            if (summary != null && "ACTIVE".equals(summary.get("status"))) {
                return new VerifyCredentialResponse(true, null);
            }
            return new VerifyCredentialResponse(false, "VC_NOT_FOUND");
        }
    }
}
