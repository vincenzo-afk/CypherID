# Trust Boundaries

## Boundary 1: Internet ↔ API Gateway
- All external traffic enters through API Gateway only
- JWT validation at gateway
- Rate limiting enforced

## Boundary 2: API Gateway ↔ Internal Services
- Services trust gateway-forwarded JWT claims
- No direct external access to services

## Boundary 3: Application Services ↔ Fabric Network
- Services connect via Fabric Gateway Java SDK
- mTLS to Fabric peers using X.509 certificates from Fabric CA
- Only authorized service accounts can submit chaincode transactions

## Boundary 4: Application Services ↔ Databases
- Database credentials stored in environment secrets
- PostgreSQL: username/password auth
- Redis: password auth
- CouchDB: username/password (Fabric managed)

## Boundary 5: Browser ↔ Protected Content
- Protected content never delivered without valid session token
- Session tokens are short-lived and bound to user DID
- Browser renderer does not receive decryption keys

## Boundary 6: AI Service ↔ Backend
- AI service can only POST anomaly alerts, cannot read arbitrary data
- Alert API is authenticated
