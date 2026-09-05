# Protected Content Service

## Part of
`asset-service` package (`com.cypherid.asset.content`)

## Responsibilities
- Validate session token on every chunk request
- Check session state (not OBSCURED, not EXPIRED)
- Retrieve encrypted file from IPFS
- Decrypt server-side (AES-256-GCM)
- Serve decrypted chunk bytes

## CRITICAL
Decryption keys NEVER leave this service.
Decrypted content served only in chunks, never as full document.
All chunk requests logged (rate limiting + audit).
