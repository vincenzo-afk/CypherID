#!/usr/bin/env bash
# Phase 2 — Join all three peers to cypherid-channel and update anchor peers.
# (docs/infrastructure/03_FABRIC_NETWORK_DEPLOYMENT.md)
#
# Each org's peer is joined using its own admin identity, then its anchor
# peer definition is broadcast to the channel.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ARTIFACTS="$ROOT/infrastructure/fabric/artifacts"

if [ ! -f "$ARTIFACTS/cypherid-channel.block" ]; then
  echo "ERROR: $ARTIFACTS/cypherid-channel.block not found. Run create-channel.sh first." >&2
  exit 1
fi

# Inside the peer containers: crypto-config is mounted at /etc/hyperledger/fabric-crypto
CRYPTO=/etc/hyperledger/fabric-crypto
ORDERER_CA="$CRYPTO/ordererOrganizations/cypherid.com/tlsca/tlsca.cypherid.com-cert.pem"

join_peer() {
  local ORG_ID="$1"      # e.g. Org1MSP
  local ORG_NUM="$2"     # e.g. 1
  local PEER_ADDR="$3"   # e.g. peer0.org1.cypherid.com:7051
  local CONTAINER="peer0-org${ORG_NUM}"
  local PEER_CA="$CRYPTO/peerOrganizations/org${ORG_NUM}.cypherid.com/tlsca/tlsca.org${ORG_NUM}.cypherid.com-cert.pem"
  local ADMIN_MSP="$CRYPTO/peerOrganizations/org${ORG_NUM}.cypherid.com/users/Admin@org${ORG_NUM}.cypherid.com/msp"

  echo "Joining $CONTAINER to cypherid-channel ..."
  docker exec \
    -e CORE_PEER_LOCALMSPID="$ORG_ID" \
    -e CORE_PEER_MSPCONFIGPATH="$ADMIN_MSP" \
    -e CORE_PEER_ADDRESS="$PEER_ADDR" \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE="$PEER_CA" \
    "$CONTAINER" peer channel join -b /opt/artifacts/cypherid-channel.block

  echo "Updating anchor peer for $ORG_ID ..."
  docker exec \
    -e CORE_PEER_LOCALMSPID="$ORG_ID" \
    -e CORE_PEER_MSPCONFIGPATH="$ADMIN_MSP" \
    -e CORE_PEER_ADDRESS="$PEER_ADDR" \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE="$PEER_CA" \
    "$CONTAINER" peer channel update -o orderer.cypherid.com:7050 \
      -c cypherid-channel -f "/opt/artifacts/${ORG_ID}anchors.tx" \
      --tls --cafile "$ORDERER_CA"
}

join_peer Org1MSP 1 peer0.org1.cypherid.com:7051
join_peer Org2MSP 2 peer0.org2.cypherid.com:8051
join_peer Org3MSP 3 peer0.org3.cypherid.com:9051

echo "All peers joined cypherid-channel."
echo "Next: ./infrastructure/scripts/deploy-chaincode.sh <identity|accesscontrol|assetregistry>"