package com.cypherid.asset.service.crypto;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Arrays;

/**
 * EncryptionService — AES-256-GCM authenticated encryption
 * (docs/assets/13_ENCRYPTED_STORAGE.md).
 * <p>
 * Design:
 * - Each asset gets a unique AES-256 key (generateKey).
 * - File content is encrypted as: IV (12 bytes) || Ciphertext || Auth Tag (16 bytes).
 * - The per-asset key is wrapped (encrypted) with a master key and stored in
 *   PostgreSQL (asset_encryption_keys table). The master key comes from the
 *   environment (ASSET_MASTER_KEY) and must be provisioned as a Docker secret
 *   / HSM in production.
 * <p>
 * Keys are NEVER exposed to the browser. Decryption happens server-side only.
 */
@Component
public class EncryptionService {

    private static final Logger logger = LoggerFactory.getLogger(EncryptionService.class);

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int IV_BYTES = 12;    // 96-bit IV for GCM
    private static final int TAG_BITS = 128;   // 128-bit auth tag
    private static final int KEY_BYTES = 32;   // AES-256

    private final SecureRandom secureRandom = new SecureRandom();
    private final byte[] masterKey;

    public EncryptionService(@Value("${asset.master-key:CypherID-Asset-Master-Key-2026!!}") String masterKeyConfig) {
        byte[] keyBytes = masterKeyConfig.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 16) {
            throw new IllegalStateException("asset.master-key must be at least 16 bytes (32 recommended for AES-256)");
        }
        if (keyBytes.length < KEY_BYTES) {
            logger.warn("asset.master-key is shorter than 32 bytes — AES-256 key will be derived; use a 32+ byte key in production");
        }
        this.masterKey = Arrays.copyOf(keyBytes, KEY_BYTES); // right-pad/truncate to 32 bytes
    }

    /**
     * Generates a fresh per-asset AES-256 key.
     */
    public byte[] generateKey() {
        byte[] key = new byte[KEY_BYTES];
        secureRandom.nextBytes(key);
        return key;
    }

    /**
     * Encrypts plaintext with the given key.
     *
     * @return IV (12 bytes) || ciphertext (ciphertext includes the 16-byte auth tag)
     */
    public byte[] encrypt(byte[] plaintext, byte[] key) throws GeneralSecurityException {
        byte[] iv = new byte[IV_BYTES];
        secureRandom.nextBytes(iv);

        Cipher cipher = Cipher.getInstance(ALGORITHM);
        cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(key, "AES"),
                new GCMParameterSpec(TAG_BITS, iv));

        byte[] ciphertext = cipher.doFinal(plaintext);

        byte[] blob = new byte[IV_BYTES + ciphertext.length];
        System.arraycopy(iv, 0, blob, 0, IV_BYTES);
        System.arraycopy(ciphertext, 0, blob, IV_BYTES, ciphertext.length);
        return blob;
    }

    /**
     * Decrypts a blob produced by {@link #encrypt(byte[], byte[])}.
     * Throws on tampering (GCM auth tag verification).
     */
    public byte[] decrypt(byte[] blob, byte[] key) throws GeneralSecurityException {
        if (blob == null || blob.length < IV_BYTES + 16) {
            throw new IllegalArgumentException("Invalid encrypted blob");
        }
        byte[] iv = Arrays.copyOfRange(blob, 0, IV_BYTES);
        byte[] ciphertext = Arrays.copyOfRange(blob, IV_BYTES, blob.length);

        Cipher cipher = Cipher.getInstance(ALGORITHM);
        cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key, "AES"),
                new GCMParameterSpec(TAG_BITS, iv));

        return cipher.doFinal(ciphertext);
    }

    /**
     * Wraps a per-asset key with the master key for storage at rest.
     */
    public KeyBlob wrapKey(byte[] assetKey) {
        try {
            byte[] wrapped = encrypt(assetKey, masterKey);
            return new KeyBlob(
                    Arrays.copyOfRange(wrapped, 0, IV_BYTES),
                    Arrays.copyOfRange(wrapped, IV_BYTES, wrapped.length));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Failed to wrap asset key", e);
        }
    }

    /**
     * Unwraps a stored asset key using the master key.
     */
    public byte[] unwrapKey(byte[] iv, byte[] wrappedKey) {
        try {
            byte[] blob = new byte[IV_BYTES + wrappedKey.length];
            System.arraycopy(iv, 0, blob, 0, IV_BYTES);
            System.arraycopy(wrappedKey, 0, blob, IV_BYTES, wrappedKey.length);
            return decrypt(blob, masterKey);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Failed to unwrap asset key", e);
        }
    }

    /**
     * Wrapped key material: the IV used for master-key encryption and the
     * resulting ciphertext (includes the auth tag).
     */
    public record KeyBlob(byte[] iv, byte[] data) {}
}