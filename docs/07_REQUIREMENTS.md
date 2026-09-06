# Requirements

## Functional Requirements

### Identity
- FR-ID-01: System shall create a unique DID for each enrolled user.
- FR-ID-02: System shall store DID documents immutably on Hyperledger Fabric.
- FR-ID-03: System shall support Verifiable Credential issuance by authorized organizations.
- FR-ID-04: System shall verify VCs cryptographically against on-chain registry.
- FR-ID-05: System shall support DID suspension and revocation.
- FR-ID-06: System shall support identity recovery via Shamir's Secret Sharing (advanced).

### Access Control
- FR-AC-01: System shall enforce RBAC policies on-chain.
- FR-AC-02: System shall enforce ABAC attribute policies on-chain.
- FR-AC-03: System shall record every access decision as a blockchain transaction.
- FR-AC-04: System shall support multi-signature approval for classified resources.
- FR-AC-05: System shall support time-bound access with automatic expiry.
- FR-AC-06: System shall support access delegation between users.

### Assets
- FR-AS-01: System shall mint digital assets (documents) as on-chain records.
- FR-AS-02: System shall store encrypted files on IPFS.
- FR-AS-03: System shall support asset ownership transfer with cryptographic proof.
- FR-AS-04: System shall support asset burn with on-chain proof of deletion.
- FR-AS-05: System shall maintain full provenance chain for every asset.

### Protection
- FR-PR-01: System shall apply camera-resistant rendering to protected content.
- FR-PR-02: System shall generate session-specific watermarks for every protected session.
- FR-PR-03: System shall support protected document, exam, and video modes.
- FR-PR-04: System shall monitor browser-observable capture events.
- FR-PR-05: System shall transition to content-obscured state on supported capture events.
- FR-PR-06: System shall support LOW, MEDIUM, HIGH, and EXTREME protection profiles.
- FR-PR-07: System shall log all security events.

## Non-Functional Requirements

- NFR-01: Backend primary language is Java 21.
- NFR-02: System shall be fully deployable via Docker Compose.
- NFR-03: Protected renderer must not cause dangerous visible flicker.
- NFR-04: System shall degrade gracefully when browser features are unavailable.
- NFR-05: Audit logs must be tamper-evident.
- NFR-06: All data at rest encrypted; all data in transit via TLS.
- NFR-07: Session expiration enforced on all protected content sessions.
- NFR-08: Rate limiting enforced at API gateway.
