package com.cypherid.asset.service.crypto;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.*;

/**
 * EncryptionServiceTest — verifies AES-256-GCM roundtrip and
 * master-key wrapping per docs/assets/13_ENCRYPTED_STORAGE.md.
 */
class EncryptionServiceTest {

    private final EncryptionService encryptionService =
            new EncryptionService("CypherID-Asset-Master-Key-2026!!");

    @Test
    void encryptDecrypt_roundtrip_returnsOriginal() throws GeneralSecurityException {
        byte[] key = encryptionService.generateKey();
        byte[] plaintext = "TOP SECRET DOCUMENT CONTENT".getBytes(StandardCharsets.UTF_8);

        byte[] encrypted = encryptionService.encrypt(plaintext, key);
        byte[] decrypted = encryptionService.decrypt(encrypted, key);

        assertNotEquals(Arrays.toString(plaintext), Arrays.toString(encrypted));
        assertArrayEquals(plaintext, decrypted);
    }

    @Test
    void encrypt_usesRandomIv_twoEncryptionsDiffer() throws GeneralSecurityException {
        byte[] key = encryptionService.generateKey();
        byte[] plaintext = "same content".getBytes(StandardCharsets.UTF_8);

        byte[] first = encryptionService.encrypt(plaintext, key);
        byte[] second = encryptionService.encrypt(plaintext, key);

        // Random IV ⇒ ciphertexts must differ even for identical plaintext
        assertFalse(Arrays.equals(first, second));
    }

    @Test
    void decrypt_tamperedBlob_throws() {
        byte[] key = encryptionService.generateKey();
        byte[] plaintext = "integrity check".getBytes(StandardCharsets.UTF_8);

        byte[] encrypted;
        try {
            encrypted = encryptionService.encrypt(plaintext, key);
        } catch (GeneralSecurityException e) {
            throw new RuntimeException(e);
        }
        // Flip one byte in the ciphertext region (after the 12-byte IV)
        encrypted[encrypted.length - 1] ^= 0x01;

        assertThrows(GeneralSecurityException.class, () -> encryptionService.decrypt(encrypted, key));
    }

    @Test
    void wrapKey_unwrapKey_roundtrip() {
        byte[] assetKey = encryptionService.generateKey();

        EncryptionService.KeyBlob wrapped = encryptionService.wrapKey(assetKey);
        byte[] unwrapped = encryptionService.unwrapKey(wrapped.iv(), wrapped.data());

        assertArrayEquals(assetKey, unwrapped);
        assertFalse(Arrays.equals(assetKey, wrapped.data()));
    }
}