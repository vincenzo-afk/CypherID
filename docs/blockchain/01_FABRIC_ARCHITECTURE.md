# Hyperledger Fabric Architecture

## Version
Hyperledger Fabric 2.5.x (LTS)

## Key Concepts

### Permissioned Network
All participants have known identities issued by Fabric CA. No anonymous participation.

### Membership Service Provider (MSP)
Each organization has an MSP defining which certificates are trusted.

### Endorsement Policy
Defines which organizations must sign a transaction for it to be valid.
Default policy: majority of channel members.

### Chaincode Lifecycle
Fabric 2.x external chaincode lifecycle:
1. Package chaincode
2. Install on peers
3. Approve by org (per org)
4. Commit to channel

## Chaincode Language
Java (Fabric Contract API). All three chaincodes are Java.

## State Database
CouchDB — enables rich JSON queries against world state.

## Consensus
Raft-based ordering (single orderer for demo; multi-orderer for production).
