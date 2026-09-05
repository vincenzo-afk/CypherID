# Incident Handling

## Incident Classification
| Severity | Definition | Response Time |
|:---|:---|:---|
| P1 CRITICAL | Data breach, unauthorized access to classified content | Immediate |
| P2 HIGH | Service unavailable, authentication bypass | < 30 minutes |
| P3 MEDIUM | AI anomaly alert, session security event | < 2 hours |
| P4 LOW | Performance degradation, non-security error | < 24 hours |

## P1 Response
1. Immediately suspend affected user DIDs (admin panel → DID suspension)
2. Invalidate all active sessions (Redis flush for affected users)
3. Capture on-chain evidence (tx hashes for affected access logs)
4. Notify security team
5. Preserve: Docker logs, PostgreSQL events, blockchain audit trail
6. Do NOT delete or modify logs

## Compromised Key Response
If Fabric CA key or JWT signing key suspected compromised:
1. Stop API Gateway immediately
2. Rotate affected key
3. Restart services with new key
4. All existing tokens are now invalid (users must re-authenticate)
5. Initiate blockchain audit review for affected period

## Post-Incident
After every P1/P2 incident:
- Generate PDF audit report (Audit Dashboard)
- Review on-chain access logs for affected period
- Document timeline and root cause
- Update threat model if new attack pattern discovered
