# Security-First Rules

## Inviolable Rules

1. **No bypass of authorization** — Never add `// TODO: add auth check later`. Auth is required before any protected endpoint goes live.

2. **No secrets in code** — Private keys, passwords, signing keys NEVER in source files. Use environment variables or Docker secrets.

3. **No custom crypto** — Use only documented standard algorithms. Do not implement your own encryption, hashing, or signing.

4. **No plaintext content in browser** — Protected content is NEVER sent as plaintext to the browser. Decryption is server-side only.

5. **No false security claims** — Do not write comments, documentation, or UI text claiming camera capture is prevented, screenshots are impossible, or recording is blocked.

6. **No keys on blockchain** — Encryption keys and private keys are NEVER written to the Fabric ledger.

7. **No SQL concatenation** — All database queries use parameterized statements via JPA.

8. **Deny by default** — If an authorization check is ambiguous, deny access. Never grant access when uncertain.

9. **Log security events** — All authorization failures, session events, and security alerts must be logged. Silent failures are not acceptable.

10. **Test auth paths** — Every access control decision must have a test for the DENIED case as well as the GRANTED case.
