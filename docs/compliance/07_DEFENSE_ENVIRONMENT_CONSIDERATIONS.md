# Defense Environment Considerations

## Air-Gapped Deployment
For classified defense environments, the system must be deployable in air-gapped networks.
- All Docker images cached locally (no internet pull at runtime)
- IPFS node is local (no public IPFS network)
- No external APIs called at runtime

## Multi-Organization Trust
- Each defense organization (DRDO, BEL, MoD) has its own Fabric CA
- No organization can issue credentials on behalf of another
- Cross-organization access requires explicit policy

## Classification Handling
The system enforces classification levels via ABAC policies.
Actual government classification markings must be reviewed by security officer before deployment.

## Audit Trail Requirements (Defense)
- All access events recorded immutably on blockchain
- Tamper-evident log (cryptographic hash chain)
- Audit trail accessible to authorized auditors without system admin access

## Key Management (Defense Production)
- Production: Hardware Security Module (HSM) for Fabric CA keys and master encryption key
- Demo: software-based key storage (acceptable for hackathon only)

## Disclaimer
This system is a prototype for hackathon demonstration.
Deployment in real classified defense environments requires:
- Security accreditation
- Penetration testing
- Formal key management procedures
- Regulatory compliance review
