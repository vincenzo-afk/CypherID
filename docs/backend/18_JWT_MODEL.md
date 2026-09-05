# JWT Model

## Access Token Claims
```json
{
  "sub": "did:cypherid:0x4a3b2c1d...",
  "iat": 1704067200,
  "exp": 1704068100,
  "roles": ["CLEARANCE_LEVEL_3", "ORG_MEMBER"],
  "org": "DRDO",
  "jti": "uuid-for-blacklist-tracking"
}
```

## Protected Session Token Claims
```json
{
  "sub": "did:cypherid:0x...",
  "sessionId": "uuid",
  "contentId": "DRDO-DOC-007",
  "contentType": "DOCUMENT",
  "profile": "HIGH",
  "iat": 1704067200,
  "exp": 1704068100,
  "jti": "uuid"
}
```

## Token Signing
- Access tokens: RS256 (asymmetric — gateway can verify without secret)
- Session tokens: HS256 (symmetric — ProtectedContentService only)

## No Sensitive Data in Claims
Claims MUST NOT contain:
- Clearance level details beyond role names
- Document content
- Encryption keys
- Personal information beyond DID
