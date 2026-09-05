# Document Security Limitations

## This Protection Does NOT Prevent
1. User memorizing document contents
2. User photographing display (mitigated by camera-resistance rendering, not prevented)
3. OS-level screen recording
4. Authorized user sharing access (sharing credentials)
5. Developer tools bypassing CSS protections

## This Protection DOES Provide
1. Server-side authorization before any content delivery
2. Session expiration
3. Session-specific watermark for forensic traceability
4. Camera-resistant rendering to reduce readability of captures
5. Browser-observable event monitoring
6. Full audit trail on blockchain

## Absolute Requirement
No protected content must be delivered to an unauthorized user.
Authorization is enforced server-side; browser-side protections are supplementary.
