# Asset Chaincode Specification

## Contract Name
`AssetContract`

## State Keys
| Key Pattern | Value Type | Description |
|:---|:---|:---|
| `ASSET:{assetId}` | Asset JSON | Asset record |
| `OWNER_ASSETS:{ownerDID}` | JSON array | Asset IDs owned by DID |

## Transactions

### mintAsset (SUBMIT)
Parameters: `assetId`, `ownerDID`, `ipfsHash`, `classification`, `policyId`, `nonce`, `timestamp`
- Verifies ownerDID is active (calls IdentityContract)
- Verifies assetId does not exist
- Creates Asset record
- Updates owner's asset list
- Emits `AssetMinted` event

### transferAsset (SUBMIT)
Parameters: `assetId`, `fromDID`, `toDID`, `ownerSignature`, `nonce`, `timestamp`
- Verifies fromDID owns asset
- Verifies ownerSignature
- Verifies toDID is active and has required clearance (calls AccessControlContract)
- Updates ownership
- Emits `AssetTransferred` event

### burnAsset (SUBMIT)
Parameters: `assetId`, `ownerDID`, `ownerSignature`, `nonce`, `timestamp`
- Verifies ownership and signature
- Sets asset status to BURNED
- Records burn timestamp (proof of deletion intent)
- Emits `AssetBurned` event

### queryAsset (EVALUATE)
Parameters: `assetId`
- Returns Asset JSON or throws if not found

### queryOwnerAssets (EVALUATE)
Parameters: `ownerDID`
- Returns list of asset IDs owned by DID

### getAssetHistory (EVALUATE)
Parameters: `assetId`
- Returns full ledger history for asset key (provenance chain)

## Asset Model
```json
{
  "assetId": "...",
  "ownerDID": "did:cypherid:0x...",
  "ipfsHash": "Qm...",
  "classification": "TOP_SECRET|SECRET|CONFIDENTIAL|UNCLASSIFIED",
  "policyId": "...",
  "status": "ACTIVE|TRANSFERRED|BURNED",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```
