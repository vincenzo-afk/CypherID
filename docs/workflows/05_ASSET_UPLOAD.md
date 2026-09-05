# Asset Upload Workflow

1. User selects file in Asset Hub
2. Frontend sends multipart upload to `POST /api/v1/assets`
3. Asset Service encrypts file (AES-256-GCM)
4. Encrypted file uploaded to IPFS → returns CID
5. Asset Service calls AssetChaincode.mintAsset
6. AssetMinted event emitted
