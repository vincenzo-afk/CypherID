package com.cypherid.identity;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import org.hyperledger.fabric.contract.Context;
import org.hyperledger.fabric.contract.ContractInterface;
import org.hyperledger.fabric.contract.annotation.*;
import org.hyperledger.fabric.shim.ChaincodeStub;
import org.hyperledger.fabric.shim.ledger.KeyValue;
import org.hyperledger.fabric.shim.ledger.QueryResultsIterator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * IdentityContract — Hyperledger Fabric Java Chaincode
 * <p>
 * Manages Decentralized Identifiers (DIDs) and Verifiable Credentials (VCs)
 * on the CypherID permissioned blockchain.
 * <p>
 * State Keys:
 * - DID:{did}           → DIDDocument JSON
 * - VC:{did}:{vcId}     → VerifiableCredential JSON
 * - NONCE:{did}         → last used nonce (replay protection)
 */
@Contract(
    name = "IdentityContract",
    info = @Info(
        title = "CypherID Identity Contract",
        description = "DID and Verifiable Credential management on Hyperledger Fabric",
        version = "1.0.0",
        license = @License(name = "Apache-2.0"),
        contact = @Contact(name = "CypherID Team", email = "itsmebk2007@gmail.com")
    )
)
@Default
public class IdentityContract implements ContractInterface {

    private static final Logger logger = LoggerFactory.getLogger(IdentityContract.class);
    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();

    // ─── State Key Prefixes ───────────────────────────────────────────────────
    private static final String KEY_DID    = "DID:";
    private static final String KEY_VC     = "VC:";
    private static final String KEY_NONCE  = "NONCE:";

    // ─── DID Status Constants ─────────────────────────────────────────────────
    public static final String STATUS_ACTIVE    = "ACTIVE";
    public static final String STATUS_SUSPENDED = "SUSPENDED";
    public static final String STATUS_REVOKED   = "REVOKED";

    // ─── Authorized Admin DIDs (bootstrapped at network init) ─────────────────
    private static final String ADMIN_DID_PREFIX = "did:cypherid:admin";

    // =========================================================================
    // createDID — SUBMIT transaction
    // =========================================================================
    @Transaction(intent = Transaction.TYPE.SUBMIT)
    public DIDDocument createDID(
            final Context ctx,
            final String did,
            final String publicKey,
            final String metadata,
            final String nonce,
            final String timestamp) {

        ChaincodeStub stub = ctx.getStub();

        // 1. Validate DID format
        validateDIDFormat(did);

        // 2. Check DID does not already exist
        String existing = stub.getStringState(KEY_DID + did);
        if (existing != null && !existing.isEmpty()) {
            throw new RuntimeException("DID already exists: " + did);
        }

        // 3. Replay protection — nonce must be unique per DID
        checkAndStoreNonce(stub, did, nonce);

        // 4. Validate inputs
        if (publicKey == null || publicKey.isBlank()) {
            throw new RuntimeException("publicKey is required");
        }

        // 5. Build DIDDocument
        DIDDocument doc = DIDDocument.builder()
                .did(did)
                .publicKey(publicKey)
                .metadata(metadata)
                .status(STATUS_ACTIVE)
                .createdAt(timestamp)
                .updatedAt(timestamp)
                .version(1)
                .build();

        // 6. Store on ledger
        stub.putStringState(KEY_DID + did, GSON.toJson(doc));

        // 7. Emit event
        stub.setEvent("DIDCreated", GSON.toJson(doc).getBytes());

        logger.info("DID created: {}", did);
        return doc;
    }

    // =========================================================================
    // resolveDID — EVALUATE transaction (read-only)
    // =========================================================================
    @Transaction(intent = Transaction.TYPE.EVALUATE)
    public DIDDocument resolveDID(final Context ctx, final String did) {
        ChaincodeStub stub = ctx.getStub();

        String json = stub.getStringState(KEY_DID + did);
        if (json == null || json.isEmpty()) {
            throw new RuntimeException("DID not found: " + did);
        }

        return GSON.fromJson(json, DIDDocument.class);
    }

    // =========================================================================
    // updateDID — SUBMIT transaction
    // =========================================================================
    @Transaction(intent = Transaction.TYPE.SUBMIT)
    public DIDDocument updateDID(
            final Context ctx,
            final String did,
            final String newPublicKey,
            final String newMetadata,
            final String nonce,
            final String timestamp) {

        ChaincodeStub stub = ctx.getStub();
        DIDDocument doc = requireActiveDID(stub, did);
        checkAndStoreNonce(stub, did, nonce);

        DIDDocument updated = DIDDocument.builder()
                .did(doc.getDid())
                .publicKey(newPublicKey != null && !newPublicKey.isBlank() ? newPublicKey : doc.getPublicKey())
                .metadata(newMetadata != null ? newMetadata : doc.getMetadata())
                .status(doc.getStatus())
                .createdAt(doc.getCreatedAt())
                .updatedAt(timestamp)
                .version(doc.getVersion() + 1)
                .build();

        stub.putStringState(KEY_DID + did, GSON.toJson(updated));
        stub.setEvent("DIDUpdated", GSON.toJson(updated).getBytes());

        logger.info("DID updated: {}", did);
        return updated;
    }

    // =========================================================================
    // suspendDID — SUBMIT transaction (admin only)
    // =========================================================================
    @Transaction(intent = Transaction.TYPE.SUBMIT)
    public DIDDocument suspendDID(
            final Context ctx,
            final String did,
            final String adminDid,
            final String reason,
            final String nonce,
            final String timestamp) {

        ChaincodeStub stub = ctx.getStub();
        requireAdmin(adminDid);
        checkAndStoreNonce(stub, adminDid, nonce);

        DIDDocument doc = requireDID(stub, did);
        if (STATUS_REVOKED.equals(doc.getStatus())) {
            throw new RuntimeException("Cannot suspend a REVOKED DID: " + did);
        }

        DIDDocument suspended = DIDDocument.builder()
                .did(doc.getDid())
                .publicKey(doc.getPublicKey())
                .metadata(doc.getMetadata())
                .status(STATUS_SUSPENDED)
                .createdAt(doc.getCreatedAt())
                .updatedAt(timestamp)
                .version(doc.getVersion() + 1)
                .build();

        stub.putStringState(KEY_DID + did, GSON.toJson(suspended));

        String eventPayload = String.format(
                "{\"did\":\"%s\",\"status\":\"SUSPENDED\",\"adminDid\":\"%s\",\"reason\":\"%s\",\"timestamp\":\"%s\"}",
                did, adminDid, reason, timestamp);
        stub.setEvent("DIDSuspended", eventPayload.getBytes());

        logger.info("DID suspended: {} by admin: {}", did, adminDid);
        return suspended;
    }

    // =========================================================================
    // revokeDID — SUBMIT transaction (admin only, irreversible)
    // =========================================================================
    @Transaction(intent = Transaction.TYPE.SUBMIT)
    public DIDDocument revokeDID(
            final Context ctx,
            final String did,
            final String adminDid,
            final String reason,
            final String nonce,
            final String timestamp) {

        ChaincodeStub stub = ctx.getStub();
        requireAdmin(adminDid);
        checkAndStoreNonce(stub, adminDid, nonce);

        DIDDocument doc = requireDID(stub, did);
        if (STATUS_REVOKED.equals(doc.getStatus())) {
            throw new RuntimeException("DID already REVOKED: " + did);
        }

        DIDDocument revoked = DIDDocument.builder()
                .did(doc.getDid())
                .publicKey(doc.getPublicKey())
                .metadata(doc.getMetadata())
                .status(STATUS_REVOKED)
                .createdAt(doc.getCreatedAt())
                .updatedAt(timestamp)
                .version(doc.getVersion() + 1)
                .build();

        stub.putStringState(KEY_DID + did, GSON.toJson(revoked));

        String eventPayload = String.format(
                "{\"did\":\"%s\",\"status\":\"REVOKED\",\"adminDid\":\"%s\",\"reason\":\"%s\",\"timestamp\":\"%s\"}",
                did, adminDid, reason, timestamp);
        stub.setEvent("DIDRevoked", eventPayload.getBytes());

        logger.info("DID revoked: {} by admin: {}", did, adminDid);
        return revoked;
    }

    // =========================================================================
    // issueVC — SUBMIT transaction
    // =========================================================================
    @Transaction(intent = Transaction.TYPE.SUBMIT)
    public VerifiableCredential issueVC(
            final Context ctx,
            final String did,
            final String vcId,
            final String vcJson,
            final String issuerDid,
            final String issuerSignature,
            final String nonce,
            final String timestamp) {

        ChaincodeStub stub = ctx.getStub();

        // Verify subject DID is active
        requireActiveDID(stub, did);

        // Verify issuer DID is active
        requireActiveDID(stub, issuerDid);

        // Replay protection
        checkAndStoreNonce(stub, issuerDid, nonce);

        // Check VC doesn't already exist
        String vcKey = KEY_VC + did + ":" + vcId;
        String existing = stub.getStringState(vcKey);
        if (existing != null && !existing.isEmpty()) {
            throw new RuntimeException("VC already exists: " + vcId);
        }

        // Validate inputs
        if (issuerSignature == null || issuerSignature.isBlank()) {
            throw new RuntimeException("issuerSignature is required");
        }

        // Build VC record
        VerifiableCredential vc = VerifiableCredential.builder()
                .vcId(vcId)
                .subjectDid(did)
                .issuerDid(issuerDid)
                .vcJson(vcJson)
                .issuerSignature(issuerSignature)
                .status("ACTIVE")
                .issuedAt(timestamp)
                .updatedAt(timestamp)
                .build();

        stub.putStringState(vcKey, GSON.toJson(vc));

        String eventPayload = String.format(
                "{\"vcId\":\"%s\",\"subjectDid\":\"%s\",\"issuerDid\":\"%s\",\"timestamp\":\"%s\"}",
                vcId, did, issuerDid, timestamp);
        stub.setEvent("VCIssued", eventPayload.getBytes());

        logger.info("VC issued: {} for DID: {} by issuer: {}", vcId, did, issuerDid);
        return vc;
    }

    // =========================================================================
    // revokeVC — SUBMIT transaction
    // =========================================================================
    @Transaction(intent = Transaction.TYPE.SUBMIT)
    public String revokeVC(
            final Context ctx,
            final String did,
            final String vcId,
            final String issuerDid,
            final String nonce,
            final String timestamp) {

        ChaincodeStub stub = ctx.getStub();
        checkAndStoreNonce(stub, issuerDid, nonce);

        String vcKey = KEY_VC + did + ":" + vcId;
        String vcJson = stub.getStringState(vcKey);
        if (vcJson == null || vcJson.isEmpty()) {
            throw new RuntimeException("VC not found: " + vcId);
        }

        VerifiableCredential vc = GSON.fromJson(vcJson, VerifiableCredential.class);

        // Only original issuer can revoke
        if (!issuerDid.equals(vc.getIssuerDid())) {
            throw new RuntimeException("Only the issuer can revoke this VC");
        }

        if ("REVOKED".equals(vc.getStatus())) {
            throw new RuntimeException("VC already revoked: " + vcId);
        }

        VerifiableCredential revoked = VerifiableCredential.builder()
                .vcId(vc.getVcId())
                .subjectDid(vc.getSubjectDid())
                .issuerDid(vc.getIssuerDid())
                .vcJson(vc.getVcJson())
                .issuerSignature(vc.getIssuerSignature())
                .status("REVOKED")
                .issuedAt(vc.getIssuedAt())
                .updatedAt(timestamp)
                .build();

        stub.putStringState(vcKey, GSON.toJson(revoked));

        String eventPayload = String.format(
                "{\"vcId\":\"%s\",\"subjectDid\":\"%s\",\"issuerDid\":\"%s\",\"timestamp\":\"%s\"}",
                vcId, did, issuerDid, timestamp);
        stub.setEvent("VCRevoked", eventPayload.getBytes());

        logger.info("VC revoked: {} by issuer: {}", vcId, issuerDid);
        return "{\"status\":\"REVOKED\",\"vcId\":\"" + vcId + "\"}";
    }

    // =========================================================================
    // verifyVC — EVALUATE transaction (read-only)
    // =========================================================================
    @Transaction(intent = Transaction.TYPE.EVALUATE)
    public String verifyVC(final Context ctx, final String did, final String vcId) {
        ChaincodeStub stub = ctx.getStub();

        String vcKey = KEY_VC + did + ":" + vcId;
        String vcJson = stub.getStringState(vcKey);

        if (vcJson == null || vcJson.isEmpty()) {
            return "{\"result\":\"NOT_FOUND\",\"vcId\":\"" + vcId + "\"}";
        }

        VerifiableCredential vc = GSON.fromJson(vcJson, VerifiableCredential.class);

        if ("REVOKED".equals(vc.getStatus())) {
            return "{\"result\":\"REVOKED\",\"vcId\":\"" + vcId + "\",\"issuerDid\":\"" + vc.getIssuerDid() + "\"}";
        }

        // Also verify subject DID is still active
        String didJson = stub.getStringState(KEY_DID + did);
        if (didJson != null && !didJson.isEmpty()) {
            DIDDocument doc = GSON.fromJson(didJson, DIDDocument.class);
            if (!STATUS_ACTIVE.equals(doc.getStatus())) {
                return "{\"result\":\"SUBJECT_DID_INACTIVE\",\"vcId\":\"" + vcId + "\",\"didStatus\":\"" + doc.getStatus() + "\"}";
            }
        }

        return String.format(
                "{\"result\":\"VALID\",\"vcId\":\"%s\",\"subjectDid\":\"%s\",\"issuerDid\":\"%s\",\"issuedAt\":\"%s\"}",
                vcId, vc.getSubjectDid(), vc.getIssuerDid(), vc.getIssuedAt());
    }

    // =========================================================================
    // listDIDs — EVALUATE — used for admin queries
    // =========================================================================
    @Transaction(intent = Transaction.TYPE.EVALUATE)
    public String listDIDsByStatus(final Context ctx, final String status) {
        ChaincodeStub stub = ctx.getStub();
        List<DIDDocument> results = new ArrayList<>();

        try (QueryResultsIterator<KeyValue> iterator = stub.getStateByRange(KEY_DID, KEY_DID + "\uFFFF")) {
            for (KeyValue kv : iterator) {
                DIDDocument doc = GSON.fromJson(kv.getStringValue(), DIDDocument.class);
                if (status == null || status.isBlank() || status.equals(doc.getStatus())) {
                    results.add(doc);
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to list DIDs: " + e.getMessage(), e);
        }

        return GSON.toJson(results);
    }

    // =========================================================================
    // Internal helpers
    // =========================================================================

    private void validateDIDFormat(String did) {
        if (did == null || !did.startsWith("did:cypherid:")) {
            throw new RuntimeException("Invalid DID format. Must start with 'did:cypherid:'. Got: " + did);
        }
    }

    private DIDDocument requireDID(ChaincodeStub stub, String did) {
        String json = stub.getStringState(KEY_DID + did);
        if (json == null || json.isEmpty()) {
            throw new RuntimeException("DID not found: " + did);
        }
        return GSON.fromJson(json, DIDDocument.class);
    }

    private DIDDocument requireActiveDID(ChaincodeStub stub, String did) {
        DIDDocument doc = requireDID(stub, did);
        if (!STATUS_ACTIVE.equals(doc.getStatus())) {
            throw new RuntimeException("DID is not ACTIVE. Status: " + doc.getStatus() + " DID: " + did);
        }
        return doc;
    }

    private void requireAdmin(String adminDid) {
        if (adminDid == null || !adminDid.startsWith(ADMIN_DID_PREFIX)) {
            throw new RuntimeException("Caller is not authorized admin. AdminDID: " + adminDid);
        }
    }

    /**
     * Replay protection: stores nonce per DID, rejects duplicate nonces.
     * In production, nonces should be time-windowed. For SIH demo, we use simple
     * collision detection with UUID nonces.
     */
    private void checkAndStoreNonce(ChaincodeStub stub, String did, String nonce) {
        if (nonce == null || nonce.isBlank()) {
            throw new RuntimeException("Nonce is required for replay protection");
        }
        String nonceKey = KEY_NONCE + did + ":" + nonce;
        String existing = stub.getStringState(nonceKey);
        if (existing != null && !existing.isEmpty()) {
            throw new RuntimeException("Nonce already used (replay attack detected): " + nonce);
        }
        stub.putStringState(nonceKey, "used");
    }
}
