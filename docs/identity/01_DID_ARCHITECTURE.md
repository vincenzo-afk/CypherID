# DID Architecture

## DID Method
`did:cypherid`

## DID Syntax
`did:cypherid:0x{hex-encoded-public-key-hash}`

Example: `did:cypherid:0x4a3b2c1d...`

## DID Resolution
DIDs are resolved by querying the IdentityChaincode on Hyperledger Fabric.
Resolution endpoint: `GET /api/identity/did/{did}`

## Relationship to X.509
Each DID holder also has a Fabric CA-issued X.509 certificate used for:
- Fabric transaction signing
- mTLS for peer communication (service accounts)

The DID is the application-level identity; X.509 is the Fabric network-level identity.

## W3C Compliance
DID Documents follow W3C DID Core specification v1.0 as closely as practical within the Fabric context.
