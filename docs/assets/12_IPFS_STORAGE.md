# IPFS Storage

## Role
IPFS stores encrypted asset files. The IPFS hash (CID) is the pointer stored on-chain.

## Upload Flow
1. Asset Service receives file upload
2. Asset Service encrypts file (AES-256-GCM) via EncryptionService
3. Asset Service uploads encrypted bytes to IPFS
4. IPFS returns CID (content identifier)
5. CID stored in AssetNFT on-chain

## Retrieval Flow
1. Authorized request via Protected Session
2. ProtectedContentService fetches encrypted bytes from IPFS using CID
3. ProtectedContentService decrypts using asset key
4. Serves to protected renderer

## IPFS Node
- Local IPFS node (Kubo) in Docker Compose for demo
- Production: private IPFS cluster or Filecoin/Pinata

## Content Addressing
IPFS uses content-based addressing (SHA-256 hash of content = CID).
Any tampering with the encrypted file is detectable by CID mismatch.

## Limitations
- IPFS content is public by hash (encryption provides confidentiality)
- Local node data is lost if volume is deleted; production requires pinning
