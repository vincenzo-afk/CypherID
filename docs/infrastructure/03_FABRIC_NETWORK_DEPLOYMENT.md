# Fabric Network Deployment

## Scripts
```
infrastructure/scripts/
├── start-network.sh      — Start Fabric network (peers, orderer, CA)
├── create-channel.sh     — Create cypherid-channel
├── join-channel.sh       — Join all peers to channel
├── deploy-chaincode.sh   — Package, install, approve, commit all 3 chaincodes
└── stop-network.sh       — Stop and clean up
```

## Deployment Steps
```bash
# 1. Generate crypto material
cryptogen generate --config=crypto-config.yaml

# 2. Generate genesis block and channel tx
configtxgen -profile CypherIDGenesis -channelID system-channel -outputBlock genesis.block
configtxgen -profile CypherIDChannel -outputCreateChannelTx channel.tx -channelID cypherid-channel

# 3. Start network
./scripts/start-network.sh

# 4. Create and join channel
./scripts/create-channel.sh
./scripts/join-channel.sh

# 5. Deploy chaincodes
./scripts/deploy-chaincode.sh identity
./scripts/deploy-chaincode.sh accesscontrol
./scripts/deploy-chaincode.sh assetregistry
```

## Endorsement Policy
All 3 orgs must endorse. Defined in configtx.yaml.

## Chaincode Build
Each chaincode built via Gradle before deployment:
```bash
cd blockchain/chaincode/identity && ./gradlew shadowJar
```
