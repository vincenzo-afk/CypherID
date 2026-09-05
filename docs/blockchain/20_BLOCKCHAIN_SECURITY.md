# Blockchain Security

## Replay Protection
Every SUBMIT transaction includes:
- `nonce`: unique per-DID counter stored on ledger
- `timestamp`: validated within ±5 minute window
- Chaincode rejects duplicate nonces

## Identity Verification
All admin operations verify the caller's MSP identity via `ctx.getClientIdentity()`.

## Chaincode Access Control
Only authorized MSP identities can call admin functions (createPolicy, suspendDID, etc.).

## Immutability
Fabric ledger is append-only. Block history cannot be altered without invalidating cryptographic chain.

## Private Data Collections
Sensitive metadata (clearance details, personal info) can be stored in Private Data Collections — shared only with authorized orgs, not written to all peers.

## Endorsement Policy
All state-changing transactions require endorsement from majority of organizations.

## No Secret Keys on Ledger
Decryption keys and private keys are NEVER written to the blockchain ledger. See `docs/architecture/08_TRUST_BOUNDARIES.md`.
