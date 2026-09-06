# Threat Catalog

| Threat ID | Threat | Attack Vector | Mitigation |
|:---|:---|:---|:---|
| T-01 | JWT token theft | Network intercept | TLS 1.3; short TTL |
| T-02 | Credential stuffing | Auth endpoint | Rate limiting; bcrypt |
| T-03 | DID impersonation | Forged DID claim | Chaincode DID verification |
| T-04 | VC forgery | Crafted VC JSON | On-chain hash comparison |
| T-05 | Replay attack | Captured tx | Nonce + timestamp in chaincode |
| T-06 | SQL injection | API parameters | JPA parameterized queries |
| T-07 | IPFS content substitution | Modified CID | CID hash checked vs on-chain |
| T-08 | Session fixation | Session token reuse | New token per session |
| T-09 | Key exfiltration | API response | Keys never in API responses |
| T-10 | Camera capture | Physical | Camera-resistant rendering |
| T-11 | Screen recording | OS-level | Monitored (browser events); not preventable |
| T-12 | Insider threat | Legitimate access | Tamper-evident audit + session monitoring |
| T-13 | Admin abuse | Admin credentials | Emergency override fully audited |
| T-14 | DDoS | High request volume | Rate limiting + connection limits |
| T-15 | CORS bypass | Cross-origin request | Strict CORS policy |
