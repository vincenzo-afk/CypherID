# Identity Requirements

## Unique Identity
Each user has one DID. DIDs are globally unique (derived from public key).

## Identity Verification
KYC process links DID to real-world identity (employee ID, government ID hash).

## Non-Repudiation
Chaincode transactions signed by user's X.509 certificate.
DID-signed requests non-repudiable via public key verification.

## Credential Validity
VCs have expiration dates. Expired VCs automatically fail verification.
