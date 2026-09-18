# Asset Lifecycle

```
MINTED -> ACTIVE -> ACTIVE (transfer, repeatable, new owner) -> BURNED
```
Transfer keeps status ACTIVE with a new owner; provenance comes from the
ledger history (`getAssetHistory`), not from a TRANSFERRED state.
Burned assets leave the owner's live index but remain in ledger history.
See `docs/workflows/05_ASSET_UPLOAD.md`, `07_ASSET_TRANSFER.md`, `19_ASSET_BURN.md`.
