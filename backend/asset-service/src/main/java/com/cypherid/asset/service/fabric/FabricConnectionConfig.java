package com.cypherid.asset.service.fabric;

import io.grpc.ChannelCredentials;
import io.grpc.ManagedChannel;
import io.grpc.TlsChannelCredentials;
import io.grpc.netty.shaded.io.grpc.netty.NettyChannelBuilder;
import org.hyperledger.fabric.client.Gateway;
import org.hyperledger.fabric.client.identity.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.InvalidKeyException;
import java.security.cert.CertificateException;
import java.util.concurrent.TimeUnit;

/**
 * FabricConnectionConfig — configures the Fabric Gateway connection for the Asset Service.
 * <p>
 * Reads TLS certificate, admin identity, and signing key from the filesystem
 * (mounted from Docker volumes or local crypto-config directory).
 * <p>
 * Connection uses gRPC over TLS to the Fabric peer.
 */
@Component
public class FabricConnectionConfig {

    private static final Logger logger = LoggerFactory.getLogger(FabricConnectionConfig.class);

    @Value("${fabric.channel-name}")
    private String channelName;

    @Value("${fabric.org-msp-id}")
    private String orgMspId;

    @Value("${fabric.identity-chaincode}")
    private String identityChaincode;

    @Value("${fabric.access-chaincode}")
    private String accessChaincode;

    @Value("${fabric.asset-chaincode}")
    private String assetChaincode;

    /** Path to peer TLS CA certificate */
    @Value("${fabric.peer-tls-cert-path:/config/fabric/tls/peer-ca.crt}")
    private String peerTlsCertPath;

    /** Path to admin user signing key (PEM) */
    @Value("${fabric.admin-key-path:/config/fabric/admin/keystore/admin_sk}")
    private String adminKeyPath;

    /** Path to admin user certificate (PEM) */
    @Value("${fabric.admin-cert-path:/config/fabric/admin/signcerts/admin.pem}")
    private String adminCertPath;

    /** Peer endpoint: host:port */
    @Value("${fabric.peer-endpoint:peer0.belorg.cypherid.com:7051}")
    private String peerEndpoint;

    /** Override authority for TLS (peer's CN in cert) */
    @Value("${fabric.peer-override-authority:peer0.belorg.cypherid.com}")
    private String peerOverrideAuthority;

    /**
     * Builds a Fabric Gateway connection.
     * Called once at startup by FabricAssetClient.
     */
    public Gateway buildGateway() throws IOException, CertificateException, InvalidKeyException {
        // Load TLS certificate for peer
        Path tlsCertPath = Path.of(peerTlsCertPath);
        if (!Files.exists(tlsCertPath)) {
            logger.warn("Fabric TLS cert not found at: {}. Using insecure connection for dev.", peerTlsCertPath);
            return buildInsecureGateway();
        }

        ChannelCredentials credentials = TlsChannelCredentials.newBuilder()
                .trustManager(tlsCertPath.toFile())
                .build();

        ManagedChannel channel = NettyChannelBuilder.forTarget(peerEndpoint, credentials)
                .overrideAuthority(peerOverrideAuthority)
                .build();

        // Load admin identity
        X509Identity identity = loadAdminIdentity();
        Signer signer = loadAdminSigner();

        return Gateway.newInstance()
                .identity(identity)
                .signer(signer)
                .connection(channel)
                .evaluateOptions(options -> options.withDeadlineAfter(10, TimeUnit.SECONDS))
                .endorseOptions(options -> options.withDeadlineAfter(15, TimeUnit.SECONDS))
                .submitOptions(options -> options.withDeadlineAfter(15, TimeUnit.SECONDS))
                .commitStatusOptions(options -> options.withDeadlineAfter(60, TimeUnit.SECONDS))
                .connect();
    }

    /**
     * Insecure gateway for local development without TLS.
     * DO NOT use in production.
     */
    private Gateway buildInsecureGateway() throws IOException, CertificateException, InvalidKeyException {
        logger.warn("INSECURE Fabric Gateway connection — development mode only!");

        String devPeerEndpoint = System.getenv().getOrDefault("FABRIC_PEER_ENDPOINT", "localhost:7051");

        ManagedChannel channel = io.grpc.ManagedChannelBuilder
                .forTarget(devPeerEndpoint)
                .usePlaintext()
                .build();

        X509Identity identity = loadAdminIdentity();
        Signer signer = loadAdminSigner();

        return Gateway.newInstance()
                .identity(identity)
                .signer(signer)
                .connection(channel)
                .evaluateOptions(options -> options.withDeadlineAfter(10, TimeUnit.SECONDS))
                .endorseOptions(options -> options.withDeadlineAfter(15, TimeUnit.SECONDS))
                .submitOptions(options -> options.withDeadlineAfter(15, TimeUnit.SECONDS))
                .commitStatusOptions(options -> options.withDeadlineAfter(60, TimeUnit.SECONDS))
                .connect();
    }

    private X509Identity loadAdminIdentity() throws IOException, CertificateException {
        Path certPath = Path.of(adminCertPath);
        if (!Files.exists(certPath)) {
            throw new IOException("Admin certificate not found: " + adminCertPath);
        }
        return Identities.newX509Identity(orgMspId,
                Identities.readX509Certificate(Files.newBufferedReader(certPath)));
    }

    private Signer loadAdminSigner() throws IOException, InvalidKeyException {
        Path keyPath = Path.of(adminKeyPath);
        if (!Files.exists(keyPath)) {
            throw new IOException("Admin signing key not found: " + adminKeyPath);
        }
        return Signers.newPrivateKeySigner(
                Identities.readPrivateKey(Files.newBufferedReader(keyPath)));
    }

    // ─── Getters ──────────────────────────────────────────────────────────────

    public String getChannelName()        { return channelName; }
    public String getOrgMspId()           { return orgMspId; }
    public String getIdentityChaincode()  { return identityChaincode; }
    public String getAccessChaincode()    { return accessChaincode; }
    public String getAssetChaincode()     { return assetChaincode; }
}