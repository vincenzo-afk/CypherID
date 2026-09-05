# Network Topology

## Organizations
- Org1 (BEL) — primary organization
- Org2 (DRDO) — partner organization
- Org3 (MoD) — partner organization

## Peers
- peer0.org1.cypherid.com
- peer0.org2.cypherid.com
- peer0.org3.cypherid.com

## Orderer
- orderer.cypherid.com (Raft, single node for demo)

## Certificate Authorities
- ca.org1.cypherid.com
- ca.org2.cypherid.com
- ca.org3.cypherid.com

## Channels
- cypherid-channel: all 3 orgs, all chaincodes

## Gossip
Peers within and across orgs use Fabric gossip for block dissemination.
