# Audit Requirements

## Auditable Events
All access decisions, identity changes, asset transfers, policy changes, and security events are auditable.

## Audit Trail Properties
- Immutable (blockchain ledger)
- Tamper-evident (cryptographic hash chain)
- Timestamped (Fabric block timestamp)
- Non-repudiable (transaction signed by submitter)

## Audit Access
- System auditors: read-only access to Audit Dashboard
- PDF export with embedded tx hashes
- Blockchain queries available for independent verification

## Audit Report Generation
See `docs/workflows/20_AUDIT_REPORT_GENERATION.md`.
