package com.cypherid.identity.service.crypto;

import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.stereotype.Service;

import java.security.*;
import java.security.spec.ECGenParameterSpec;
import java.util.Base64;
import java.util.HexFormat;

/**
 * DIDKeyService — generates EC key pairs for DID creation.
 * <p>
 * Uses ECDSA P-256 (secp256r1) — the same curve used by Hyperledger Fabric.
 * <p>
 * DID format: did:cypherid:0x{hex-of-public-key-hash}
 */
@Service
public class DIDKeyService {

    static {
        Security.addProvider(new BouncyCastleProvider());
    }

    /**
     * Generates a new ECDSA P-256 key pair.
     * @return KeyPair with EC public/private keys
     */
    public KeyPair generateKeyPair() throws NoSuchAlgorithmException,
            InvalidAlgorithmParameterException, NoSuchProviderException {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("EC", "BC");
        generator.initialize(new ECGenParameterSpec("P-256"), new SecureRandom());
        return generator.generateKeyPair();
    }

    /**
     * Derives the DID from a public key.
     * DID = "did:cypherid:0x" + first 20 bytes of SHA-256(publicKey) as hex
     *
     * This mirrors Ethereum-style address derivation adapted for CypherID.
     */
    public String deriveDID(PublicKey publicKey) throws NoSuchAlgorithmException {
        byte[] encoded = publicKey.getEncoded();
        MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
        byte[] hash = sha256.digest(encoded);

        // Take first 20 bytes (similar to Ethereum address)
        byte[] addressBytes = new byte[20];
        System.arraycopy(hash, 0, addressBytes, 0, 20);

        return "did:cypherid:0x" + HexFormat.of().formatHex(addressBytes);
    }

    /**
     * Encodes a public key to Base64 for storage in DIDDocument.
     */
    public String encodePublicKey(PublicKey publicKey) {
        return Base64.getEncoder().encodeToString(publicKey.getEncoded());
    }

    /**
     * Encodes a private key to Base64 — used for returning to client during DID creation.
     * Client must store this securely; backend does NOT persist private keys.
     */
    public String encodePrivateKey(PrivateKey privateKey) {
        return Base64.getEncoder().encodeToString(privateKey.getEncoded());
    }

    /**
     * Signs data with a private key — used for owner signatures on asset operations.
     */
    public byte[] sign(byte[] data, PrivateKey privateKey)
            throws NoSuchAlgorithmException, InvalidKeyException, SignatureException, NoSuchProviderException {
        Signature signer = Signature.getInstance("SHA256withECDSA", "BC");
        signer.initSign(privateKey, new SecureRandom());
        signer.update(data);
        return signer.sign();
    }
}
