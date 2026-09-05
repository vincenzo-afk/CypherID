# Asset Burn Workflow

1. Owner selects asset → Burn
2. Owner signs burn request
3. AssetChaincode.burnAsset validates ownership + signature
4. Asset status = BURNED on-chain
5. AssetBurned event emitted
6. Encrypted file on IPFS: not auto-deleted (IPFS limitation); production: unpinning scheduled
