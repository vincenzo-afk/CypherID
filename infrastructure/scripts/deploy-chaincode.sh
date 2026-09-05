#!/usr/bin/env bash
# Phase 2 — Deploy one chaincode to cypherid-channel (Fabric 2.x lifecycle).
# (docs/infrastructure/03_FABRIC_NETWORK_DEPLOYMENT.md)
#
# Usage: ./deploy-chaincode.sh <identity|accesscontrol|assetregistry>
#
# Steps per chaincode: build (gradle shadowJar) → package → install on all
# 3 peers → approve per org → commit. Endorsement: all 3 orgs (AND policy).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ARTIFACTS="$ROOT/infrastructure/fabric/artifacts"

CC="${1:-}"
VERSION="1.0"
SEQUENCE="1"
POLICY="AND('Org1MSP.peer','Org2MSP.peer','Org3MSP.peer')"

case "$CC" in
  identity)
    CC_DIR="identity"
    JAR="identity-chaincode-${VERSION}.jar"
    ;;
  accesscontrol)
    CC_DIR="access-control"
    JAR="access-control-chaincode-${VERSION}.jar"
    ;;
  assetregistry)
    CC_DIR="asset-registry"
    JAR="asset-registry-chaincode-${VERSION}.jar"
    ;;
  *)
    echo "Usage: $0 <identity|accesscontrol|assetregistry>" >&2
    exit 1
    ;;
esac

JAR_PATH="$ROOT/blockchain/chaincode/$CC_DIR/build/libs/$JAR"

# Inside the peer containers: crypto-config is mounted at /etc/hyperledger/fabric-crypto
CRYPTO=/etc/hyperledger/fabric-crypto
ORDERER_CA="$CRYPTO/ordererOrganizations/cypherid.com/tlsca/tlsca.cypherid.com-cert.pem"

# ── 1. Build the chaincode jar (requires JDK 21 + Gradle) ────────────────────
if [ ! -f "$JAR_PATH" ]; then
  echo "Building $CC chaincode ..."
  (cd "$ROOT/blockchain/chaincode/$CC_DIR" && gradle shadowJar)
fi
if [ ! -f "$JAR_PATH" ]; then
  echo "ERROR: chaincode jar not produced at $JAR_PATH" >&2
  exit 1
fi
echo "Chaincode jar: $JAR_PATH"

# ── 2. Package (from peer0-org1; jars are mounted at /opt/chaincode) ─────────
echo "Packaging $CC chaincode ..."
docker exec \
  -e CORE_PEER_LOCALMSPID=Org1MSP \
  -e CORE_PEER_MSPCONFIGPATH="$CRYPTO/peerOrganizations/org1.cypherid.com/users/Admin@org1.cypherid.com/msp" \
  -e CORE_PEER_ADDRESS=peer0.org1.cypherid.com:7051 \
  -e CORE_PEER_TLS_ENABLED=true \
  -e CORE_PEER_TLS_ROOTCERT_FILE="$CRYPTO/peerOrganizations/org1.cypherid.com/tlsca/tlsca.org1.cypherid.com-cert.pem" \
  peer0-org1 \
  peer lifecycle chaincode package "/opt/artifacts/${CC}.tar.gz" \
    --lang java --path "/opt/chaincode/${CC_DIR}/build/libs/${JAR}" \
    --label "${CC}_${VERSION}"

# ── 3. Install on all three peers ─────────────────────────────────────────────
install_peer() {
  local ORG_ID="$1"
  local ORG_NUM="$2"
  local PEER_ADDR="$3"
  local CONTAINER="peer0-org${ORG_NUM}"

  echo "Installing $CC on $CONTAINER ..."
  docker exec \
    -e CORE_PEER_LOCALMSPID="$ORG_ID" \
    -e CORE_PEER_MSPCONFIGPATH="$CRYPTO/peerOrganizations/org${ORG_NUM}.cypherid.com/users/Admin@org${ORG_NUM}.cypherid.com/msp" \
    -e CORE_PEER_ADDRESS="$PEER_ADDR" \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE="$CRYPTO/peerOrganizations/org${ORG_NUM}.cypherid.com/tlsca/tlsca.org${ORG_NUM}.cypherid.com-cert.pem" \
    "$CONTAINER" peer lifecycle chaincode install "/opt/artifacts/${CC}.tar.gz"
}

install_peer Org1MSP 1 peer0.org1.cypherid.com:7051
install_peer Org2MSP 2 peer0.org2.cypherid.com:8051
install_peer Org3MSP 3 peer0.org3.cypherid.com:9051

# ── 4. Resolve the package ID (from peer0-org1) ───────────────────────────────
PACKAGE_ID="$(docker exec \
  -e CORE_PEER_LOCALMSPID=Org1MSP \
  -e CORE_PEER_MSPCONFIGPATH="$CRYPTO/peerOrganizations/org1.cypherid.com/users/Admin@org1.cypherid.com/msp" \
  -e CORE_PEER_ADDRESS=peer0.org1.cypherid.com:7051 \
  -e CORE_PEER_TLS_ENABLED=true \
  -e CORE_PEER_TLS_ROOTCERT_FILE="$CRYPTO/peerOrganizations/org1.cypherid.com/tlsca/tlsca.org1.cypherid.com-cert.pem" \
  peer0-org1 peer lifecycle chaincode queryinstalled \
  | sed -n "s/.*Package ID: \(${CC}_${VERSION}:[^,]*\), Label:.*/\1/p" | head -1)"

if [ -z "$PACKAGE_ID" ]; then
  echo "ERROR: could not determine package ID for ${CC}_${VERSION}" >&2
  exit 1
fi
echo "Package ID: $PACKAGE_ID"

# ── 5. Approve for each org ───────────────────────────────────────────────────
approve_org() {
  local ORG_ID="$1"
  local ORG_NUM="$2"
  local PEER_ADDR="$3"
  local CONTAINER="peer0-org${ORG_NUM}"

  echo "Approving $CC definition for $ORG_ID ..."
  docker exec \
    -e CORE_PEER_LOCALMSPID="$ORG_ID" \
    -e CORE_PEER_MSPCONFIGPATH="$CRYPTO/peerOrganizations/org${ORG_NUM}.cypherid.com/users/Admin@org${ORG_NUM}.cypherid.com/msp" \
    -e CORE_PEER_ADDRESS="$PEER_ADDR" \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE="$CRYPTO/peerOrganizations/org${ORG_NUM}.cypherid.com/tlsca/tlsca.org${ORG_NUM}.cypherid.com-cert.pem" \
    "$CONTAINER" peer lifecycle chaincode approveformyorg \
      -o orderer.cypherid.com:7050 --channelID cypherid-channel \
      --name "$CC" --version "$VERSION" --sequence "$SEQUENCE" \
      --package-id "$PACKAGE_ID" --signature-policy "$POLICY" \
      --tls --cafile "$ORDERER_CA"
}

approve_org Org1MSP 1 peer0.org1.cypherid.com:7051
approve_org Org2MSP 2 peer0.org2.cypherid.com:8051
approve_org Org3MSP 3 peer0.org3.cypherid.com:9051

# ── 6. Commit to channel ──────────────────────────────────────────────────────
echo "Committing $CC to cypherid-channel ..."
docker exec \
  -e CORE_PEER_LOCALMSPID=Org1MSP \
  -e CORE_PEER_MSPCONFIGPATH="$CRYPTO/peerOrganizations/org1.cypherid.com/users/Admin@org1.cypherid.com/msp" \
  -e CORE_PEER_ADDRESS=peer0.org1.cypherid.com:7051 \
  -e CORE_PEER_TLS_ENABLED=true \
  -e CORE_PEER_TLS_ROOTCERT_FILE="$CRYPTO/peerOrganizations/org1.cypherid.com/tlsca/tlsca.org1.cypherid.com-cert.pem" \
  peer0-org1 peer lifecycle chaincode commit \
    -o orderer.cypherid.com:7050 --channelID cypherid-channel \
    --name "$CC" --version "$VERSION" --sequence "$SEQUENCE" \
    --signature-policy "$POLICY" \
    --peerAddresses peer0.org1.cypherid.com:7051 \
    --tlsRootCertFiles "$CRYPTO/peerOrganizations/org1.cypherid.com/tlsca/tlsca.org1.cypherid.com-cert.pem" \
    --peerAddresses peer0.org2.cypherid.com:8051 \
    --tlsRootCertFiles "$CRYPTO/peerOrganizations/org2.cypherid.com/tlsca/tlsca.org2.cypherid.com-cert.pem" \
    --peerAddresses peer0.org3.cypherid.com:9051 \
    --tlsRootCertFiles "$CRYPTO/peerOrganizations/org3.cypherid.com/tlsca/tlsca.org3.cypherid.com-cert.pem" \
    --tls --cafile "$ORDERER_CA"

echo "Chaincode $CC deployed (sequence $SEQUENCE)."