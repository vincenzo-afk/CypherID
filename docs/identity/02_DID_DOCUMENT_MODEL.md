# DID Document Model

## Structure
```json
{
  "@context": ["https://www.w3.org/ns/did/v1"],
  "id": "did:cypherid:0x...",
  "verificationMethod": [
    {
      "id": "did:cypherid:0x...#key-1",
      "type": "JsonWebKey2020",
      "controller": "did:cypherid:0x...",
      "publicKeyJwk": { ... }
    }
  ],
  "authentication": ["did:cypherid:0x...#key-1"],
  "assertionMethod": ["did:cypherid:0x...#key-1"],
  "service": [
    {
      "id": "did:cypherid:0x...#cypherid",
      "type": "CypherIDProfile",
      "serviceEndpoint": "https://cypherid.bel.gov.in/profile/0x..."
    }
  ],
  "metadata": {
    "organization": "BEL",
    "department": "R&D",
    "status": "ACTIVE",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z",
    "version": 1
  }
}
```

## On-Chain Storage
Full DID Document JSON stored as world state value under key `DID:{did}`.
