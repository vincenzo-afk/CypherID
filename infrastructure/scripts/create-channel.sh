#!/usr/bin/env bash
# Phase 2 — Create the cypherid-channel on the orderer.
# (docs/infrastructure/03_FABRIC_NETWORK_DEPLOYMENT.md)
#
# Runs the peer CLI inside the peer0-org1 container using Org1's admin identity.
# Produces: infrastructure/fabric/artifacts/cypherid-channel.block

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ARTIFACTS="$ROOT/infrastructure/fabric/artifacts"

if [ ! -f "$ARTIFACTS/channel.tx" ]; then
  echo "ERROR: $ARTIFACTS/channel.tx not found. Run start-network.sh first." >&2
  exit 1
fi

# Inside the peer containers: crypto-config is mounted at /etc/hyperledger/fabric-crypto
CRYPTO=/etc/hyperledger/fabric-crypto
ORDERER_CA="$CRYPTO/ordererOrganizations/cypherid.com/tlsca/tlsca.cypherid.com-cert.pem"

echo "Creating channel cypherid-channel ..."
docker exec \
  -e CORE_PEER_LOCALMSPID=Org1MSP \
  -e CORE_PEER_MSPCONFIGPATH="$CRYPTO/peerOrganizations/org1.cypherid.com/users/Admin@org1.cypherid.com/msp" \
  -e CORE_PEER_ADDRESS=peer0.org1.cypherid.com:7051 \
  -e CORE_PEER_TLS_ENABLED=true \
  -e CORE_PEER_TLS_ROOTCERT_FILE="$CRYPTO/peerOrganizations/org1.cypherid.com/tlsca/tlsca.org1.cypherid.com-cert.pem" \
  peer0-org1 \
  peer channel create -o orderer.cypherid.com:7050 -c cypherid-channel \
    -f /opt/artifacts/channel.tx --outputBlock /opt/artifacts/cypherid-channel.block \
    --tls --cafile "$ORDERER_CA"

echo "Channel created: $ARTIFACTS/cypherid-channel.block"
echo "Next: ./infrastructure/scripts/join-channel.sh"