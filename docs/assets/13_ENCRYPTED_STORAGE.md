# Encrypted Storage

## Algorithm
AES-256-GCM (Authenticated Encryption with Associated Data)

## Key Per Asset
Each asset has a unique AES-256 encryption key.

## Key Storage
Asset encryption keys are stored in:
- PostgreSQL (ProtectedContentService records), encrypted at rest using a master key
- Master key stored as Docker secret / HSM (production)

## Encryption Process
```java
// Pseudocode — see EncryptionService.java
byte[] key = generateRandomKey(256); // AES-256
byte[] iv = generateRandomIV(96);    // 96-bit IV for GCM
byte[] encrypted = AES_GCM_encrypt(plaintext, key, iv);
byte[] authTag = extractAuthTag(encrypted); // 128-bit auth tag
```

## Storage Format
IPFS stores: `IV (12 bytes) || Ciphertext || Auth Tag (16 bytes)`

## Decryption
Only ProtectedContentService decrypts. The browser never receives keys or plaintext.
