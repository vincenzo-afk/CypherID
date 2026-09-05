# Startup

## Full System Startup
```bash
# 1. Set environment
cp .env.example .env
# Edit .env with real secrets

# 2. Generate Fabric crypto material
cd blockchain/network
cryptogen generate --config=crypto-config.yaml

# 3. Generate channel artifacts
configtxgen -profile CypherIDGenesis -channelID system-channel -outputBlock genesis.block
configtxgen -profile CypherIDChannel -outputCreateChannelTx channel.tx -channelID cypherid-channel

# 4. Start all infrastructure
docker compose up -d

# 5. Wait for Fabric peers to be healthy
./scripts/wait-for-fabric.sh

# 6. Create channel and join peers
./scripts/create-channel.sh
./scripts/join-channel.sh

# 7. Deploy chaincodes
./scripts/deploy-chaincode.sh identity
./scripts/deploy-chaincode.sh accesscontrol
./scripts/deploy-chaincode.sh assetregistry

# 8. Initialize system (create admin DID, seed default policies)
./scripts/init-system.sh

# 9. Verify system health
curl http://localhost:8080/api/v1/health
```

## Startup Time
Expected full startup: 3–5 minutes on 16GB RAM host.

## Verification
- All services show status UP in health endpoint
- `peer channel list` shows cypherid-channel on all peers
- Block height > 0 on all peers
- Admin login succeeds
