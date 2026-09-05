# Key Management

## Key Inventory
| Key | Location | Rotation |
|:---|:---|:---|
| JWT RS256 signing key | Docker secret | 90 days |
| Session HMAC key | Docker secret | 30 days |
| Master encryption key | Docker secret / HSM | 180 days |
| Asset AES-256 keys | PostgreSQL (wrapped) | On key rotation |
| Fabric CA root key | Fabric CA volume | Per Fabric CA policy |
| Fabric peer TLS keys | Fabric crypto-config | Per Fabric CA policy |
| DID signing keys | User-held | User-initiated |

## Key Wrapping
Asset keys wrapped with master key using AES-256-GCM.
Master key derivation uses HKDF-SHA256.

## Key Rotation Procedure
See `docs/operations/07_KEY_ROTATION.md`.

## No Key Escrow (Default)
User private keys are not escrowed by default.
Optional: Shamir's Secret Sharing escrow (see `docs/identity/08_DID_RECOVERY.md`).
