# JWT Model

## Access Token Claims
```json
{
  "sub": "did:cypherid:0x4a3b2c1d...",
  "iat": 1704067200,
  "exp": 1704085200,
  "roles": "SECRET,CONFIDENTIAL,UNCLASSIFIED,CLEARANCE_LEVEL_3",
  "org": "DRDO",
  "jti": "uuid-for-blacklist-tracking"
}
```

> `roles` is a comma-joined string (see
> `JwtService.issueAccessToken`), not a JSON array. `exp - iat` is 18000s
> (5 hours), matching `jwt.expiration-seconds` in
> `identity-service/src/main/resources/application.yml`.

## Protected Session Token Claims
```json
{
  "iss": "cypherid-protected-session",
  "sub": "{sessionId-uuid}",
  "userDID": "did:cypherid:0x...",
  "contentId": "DRDO-DOC-007",
  "contentType": "DOCUMENT",
  "profile": "HIGH",
  "iat": 1704067200,
  "exp": 1704068100,
  "jti": "uuid"
}
```

> Issued by `SessionTokenService.issue` — `sub` is the session UUID, the
> caller's DID is in `userDID`, and the issuer claim is required on parse.

## Token Signing
- Access tokens: HS256 (HMAC-SHA with shared `jwt.secret` — RS256 is not
  implemented; see JwtService/JwtAuthFilter)
- Session tokens: HS256 (symmetric — ProtectedContentService only, separate
  `protection.session-jwt-secret`)

## No Sensitive Data in Claims
Claims MUST NOT contain:
- Clearance level details beyond role names
- Document content
- Encryption keys
- Personal information beyond DID
