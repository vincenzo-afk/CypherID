# Digital Asset Architecture

## Concept
Digital assets in CypherID are tokenized representations of documents, licenses, and intellectual property.
They are NOT cryptocurrency tokens. They represent ownership and access rights to off-chain encrypted files.

## Architecture
```
Document (plaintext)
    ↓
Encrypt (AES-256-GCM, per-asset key)
    ↓
IPFS Upload → IPFS Hash (CID)
    ↓
Mint Asset (on-chain): assetId, ownerDID, ipfsHash, classification, policyId
    ↓
Asset NFT on Fabric Ledger
```

## Access
```
User requests asset
    ↓
Access evaluated (see access-control/)
    ↓
IF GRANTED: Protected Session issued
    ↓
ProtectedContentService retrieves encrypted file from IPFS
    ↓
ProtectedContentService decrypts (never in browser)
    ↓
Serves decrypted content via protected renderer
```

## Key Point
Decryption keys are NEVER sent to the browser.
Decryption happens server-side in ProtectedContentService.
