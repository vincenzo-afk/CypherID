# Insider Threat Model

## Threat Profile
A legitimate user (or admin) with valid credentials attempting to:
- Access resources beyond their clearance
- Exfiltrate classified content
- Photograph exam questions
- Leak document contents

## Mitigations
1. On-chain access control — every access logged, tamper-evident
2. Camera-resistant rendering — reduces readability of captured content
3. Watermarking — leaked captures traceable to session
4. Tamper-evident audit — every access logged on-chain; unusual patterns reviewable in Audit Dashboard
5. Multi-signature approval — classified resources require multiple admins
6. Emergency override audit — all override actions permanently recorded
7. Session expiry — limits window for data collection

## Limitations
Cannot prevent: user reading document and memorising content.
Cannot prevent: user sharing legitimate access with others.
Watermarking provides deterrence and forensics, not prevention.
