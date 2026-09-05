# Fabric Network Scripts (Phase 2)

Brings up the Hyperledger Fabric 2.5 network and deploys the three Java
chaincodes. See `docs/infrastructure/03_FABRIC_NETWORK_DEPLOYMENT.md`.

## Topology (docs/blockchain/02_NETWORK_TOPOLOGY.md)

| Component | Host | Port |
|---|---|---|
| Orderer (Raft) | `orderer.cypherid.com` | 7050 |
| Peer Org1 (BEL) | `peer0.org1.cypherid.com` | 7051 |
| Peer Org2 (DRDO) | `peer0.org2.cypherid.com` | 8051 |
| Peer Org3 (MoD) | `peer0.org3.cypherid.com` | 9051 |
| CA Org1 | `ca.org1.cypherid.com` | 7054 |
| CA Org2 | `ca.org2.cypherid.com` | 8054 |
| CA Org3 | `ca.org3.cypherid.com` | 9054 |
| CouchDB (per org) | couchdb0/1/2 | 5984/6984/7984 |

- Channel: `cypherid-channel` (all 3 orgs, all 3 chaincodes)
- Endorsement: **all 3 orgs must endorse** every transaction
  (`AND('Org1MSP.peer','Org2MSP.peer','Org3MSP.peer')` — defined in
  `configtx.yaml` and passed at chaincode commit)

## Prerequisites

- Docker with compose plugin
- Fabric 2.5 binaries on PATH: `cryptogen`, `configtxgen`
  (e.g. from `hyperledger/fabric-tools`, or a Fabric 2.5 binary release)
- JDK 21 + Gradle (to build the Java chaincode jars)

## Usage

```bash
# 1. Generate crypto material, genesis block, channel tx; start containers
./infrastructure/scripts/start-network.sh

# 2. Create the channel
./infrastructure/scripts/create-channel.sh

# 3. Join all peers + update anchor peers
./infrastructure/scripts/join-channel.sh

# 4. Deploy each chaincode (order matters: identity first)
./infrastructure/scripts/deploy-chaincode.sh identity
./infrastructure/scripts/deploy-chaincode.sh accesscontrol
./infrastructure/scripts/deploy-chaincode.sh assetregistry

# Tear down (stops containers, removes generated material)
./infrastructure/scripts/stop-network.sh
```

The Fabric containers are behind the `fabric` compose profile, so
`docker compose up -d` (infrastructure + services only) is unaffected until
`start-network.sh` runs `docker compose --profile fabric up -d`.

## Generated material (never committed — see .gitignore)

```
infrastructure/fabric/
├── crypto-config/        # cryptogen output (PRIVATE KEYS)
├── artifacts/            # genesis.block, channel.tx, anchor txs, chaincode pkgs
├── config/               # TLS CA + admin identity copied for the Java services
├── crypto-config.yaml    # (committed) cryptogen topology
└── configtx.yaml         # (committed) channel + endorsement policy
```

`start-network.sh` copies Org1's peer TLS CA cert and Org1 admin identity from
`crypto-config/` into `config/`, which the Java services mount at
`/config/fabric` (`FABRIC_PEER_TLS_CERT`, `FABRIC_ADMIN_KEY`,
`FABRIC_ADMIN_CERT`).