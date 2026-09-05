# Identity Security

## DID Spoofing
- DIDs are derived from public keys; cannot be spoofed without the private key
- Fabric CA enrollment ties DID to real-world KYC identity

## VC Forgery
- VCs include issuer signature; forgery requires compromising issuer private key
- On-chain hash comparison detects tampered VCs

## Replay Attacks
- Every SUBMIT transaction includes nonce + timestamp
- Chaincode rejects replayed nonces

## Key Compromise
- Compromised DID key: admin suspends/revokes DID
- Compromised Fabric CA key: incident response per `docs/operations/11_INCIDENT_HANDLING.md`

## Identity Recovery
- Shamir's Secret Sharing requires 3-of-5 admin participation
- Recovery workflow is fully audited on-chain

## Credential Theft
- VC theft is limited by on-chain status check
- Revoked VCs fail verification regardless of whether attacker has the credential file
