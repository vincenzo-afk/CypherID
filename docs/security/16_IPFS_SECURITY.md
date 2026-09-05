# IPFS Security

## Content-Based Addressing
IPFS CID = SHA-256 hash of content.
Tampered file produces different CID → detected by mismatch with on-chain stored CID.

## Confidentiality
Files encrypted with AES-256-GCM before IPFS upload.
IPFS stores only ciphertext; plaintext never on IPFS.

## Access Control
IPFS does not provide access control (content-addressed = public by hash).
Confidentiality provided entirely by encryption.
CID knowledge + decryption key required to read content.
CIDs never exposed to unauthorised clients.
Decryption keys never exposed to clients.

## Local IPFS Node
Demo uses local Kubo node. Port 5001 (IPFS API) must not be exposed externally.
