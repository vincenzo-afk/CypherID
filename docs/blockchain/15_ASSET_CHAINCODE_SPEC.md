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
Parameters: `assetId`, `ownerDID`, `ipfsHash`, `classification`, `policyId`, `fileName`, `fileType`, `fileSizeBytes`, `nonce`, `timestamp`
- Verifies assetId does not exist and ownerDID format
- Cross-contract owner-ACTIVE verification is not yet wired (documented
  limitation — ownership checks are prefix + local validation)
- Creates Asset record
- Updates owner's asset list
- Emits `AssetMinted` event

### transferAsset (SUBMIT)
Parameters: `assetId`, `fromDID`, `toDID`, `ownerSignature`, `nonce`, `timestamp`
- Verifies fromDID owns asset and asset is ACTIVE
- Verifies ownerSignature presence (cryptographic validity is the
  client/security layer's responsibility — see AssetService docs)
- Updates ownership, keeps status ACTIVE (provenance is the ledger history,
  not a TRANSFERRED state — see docs/assets/03_ASSET_LIFECYCLE.md)
- Updates both owner indices
- Emits `AssetTransferred` event

### burnAsset (SUBMIT)
Parameters: `assetId`, `ownerDID`, `ownerSignature`, `nonce`, `timestamp`
- Verifies ownership and signature
- Sets asset status to BURNED, records burn time in the `AssetBurned` event
- Removes the asset from the owner's live index (`queryOwnerAssets` excludes
  burned assets; ledger history keeps the provenance chain)
- Emits `AssetBurned` event

### queryAsset (EVALUATE)
Parameters: `assetId`
- Returns Asset JSON or throws if not found

### queryOwnerAssets (EVALUATE)
Parameters: `ownerDID`
- Returns live list of asset IDs owned by DID (burned assets excluded)

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
  "fileName": "...",
  "fileType": "...",
  "fileSizeBytes": "...",
  "status": "ACTIVE|BURNED",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```
