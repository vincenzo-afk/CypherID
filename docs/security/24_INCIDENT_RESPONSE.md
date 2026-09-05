# Incident Response

See `docs/operations/11_INCIDENT_HANDLING.md` for full incident response procedures.

## Security-Specific Response Actions
1. DID suspension via admin panel (immediate)
2. Session invalidation (Redis flush for affected user)
3. On-chain evidence capture (tx hash collection)
4. Audit log export (PDF with embedded tx hashes)
5. Fabric network audit (query block range for affected period)

## Evidence Preservation
Never delete logs during incident investigation.
Blockchain provides tamper-evident evidence.
PostgreSQL logs provide operational context.
