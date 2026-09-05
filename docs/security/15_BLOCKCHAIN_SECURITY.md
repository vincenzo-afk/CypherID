# Blockchain Security

See `docs/blockchain/20_BLOCKCHAIN_SECURITY.md` for Fabric-specific security.

## Chaincode Security
- No nondeterministic operations
- Replay protection (nonce + timestamp)
- Caller identity verified via MSP
- Admin operations restricted to authorised MSP identities

## Ledger Integrity
Fabric cryptographic hash chain makes tampering detectable.
Block hashes chain from genesis block.

## Key Architectural Rule
Blockchain MUST NOT store decryption keys, private keys, or session secrets.
Blockchain stores: state hashes, ownership records, access logs, policy definitions.
