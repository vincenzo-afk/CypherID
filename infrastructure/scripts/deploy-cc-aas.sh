#!/usr/bin/env bash
# Phase 2 — Deploy one Java chaincode as chaincode-as-a-service (ccaas).
# (The 2.5 peer image only ships the ccaas external builder, so the classic
# `package --lang java --path <jar>` route cannot build. The chaincode mains
# support server mode via --ccaas / CHAINCODE_SERVER_ADDRESS.)
#
# Usage: ./deploy-cc-aas.sh <identity|accesscontrol|assetregistry>
#
# Flow per chaincode: package (connection.json) → install on all 3 peers →
# start the chaincode server container (needs the package ID) → approve per
# org → commit. Endorsement: all 3 orgs (AND policy).
#
# Prerequisites: channel joined (join-channel.sh), chaincode shadowJar built
# (./gradlew :blockchain:chaincode:<dir>:shadowJar — jar version x.y.z is
# copied to the x.y name this script expects), eclipse-temurin:21-jre image.

set -euo pipefail
export MSYS_NO_PATHCONV=1

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ARTIFACTS="$ROOT/infrastructure/fabric/artifacts"
CCAAS="$ROOT/infrastructure/fabric/ccaas"

CC="${1:-}"
VERSION="1.0"
SEQUENCE="1"
POLICY="AND('Org1MSP.peer','Org2MSP.peer','Org3MSP.peer')"

case "$CC" in
  identity)
    CC_DIR="identity"
    JAR="identity-chaincode-${VERSION}.jar"
    SERVER="cypherid-cc-identity"
    ;;
  accesscontrol)
    CC_DIR="access-control"
    JAR="access-control-chaincode-${VERSION}.jar"
    SERVER="cypherid-cc-accesscontrol"
    ;;
  assetregistry)
    CC_DIR="asset-registry"
    JAR="asset-registry-chaincode-${VERSION}.jar"
    SERVER="cypherid-cc-assetregistry"
    ;;
  *)
    echo "Usage: $0 <identity|accesscontrol|assetregistry>" >&2
    exit 1
    ;;
esac

JAR_PATH="$ROOT/blockchain/chaincode/$CC_DIR/build/libs/$JAR"
CONN_DIR="$CCAAS/$CC"

# Inside the peer containers: crypto-config is mounted at /etc/hyperledger/fabric-crypto
CRYPTO=/etc/hyperledger/fabric-crypto
ORDERER_CA="$CRYPTO/ordererOrganizations/cypherid.com/tlsca/tlsca.cypherid.com-cert.pem"

[ -f "$JAR_PATH" ] || { echo "ERROR: chaincode jar not produced at $JAR_PATH" >&2; exit 1; }
[ -f "$CONN_DIR/connection.json" ] || { echo "ERROR: $CONN_DIR/connection.json missing" >&2; exit 1; }

# ── 1. Package (hand-crafted: the peer CLI only stamps golang/java/node
# types, which the ccaas builder declines. A lifecycle package is just
# metadata.json + code.tar.gz, so we tar it ourselves with type "ccaas"
# and connection.json at the code root.) ─────────────────────────────────
echo "Packaging $CC chaincode (ccaas, hand-crafted) ..."
PKG_TMP="$(mktemp -d)"
mkdir -p "$PKG_TMP/code"
printf '{"path":"%s","type":"ccaas","label":"%s_%s"}' "$CC" "$CC" "$VERSION" > "$PKG_TMP/metadata.json"
cp "$CONN_DIR/connection.json" "$PKG_TMP/code/connection.json"
# Deterministic tarballs (fixed mtime/uid/sort, gzip mtime=0): re-running the
# script for the same inputs yields the SAME package ID, so reinstalls and
# re-approvals stay consistent instead of spawning a new ID per run.
# (Python, because git-bash ships BSD tar without GNU --sort-name/--mtime.)
PYBIN="${PYTHON_BIN:-python3}"
# NOTE: on Windows git-bash, `python3` may resolve to the Microsoft Store stub
# (which exists but fails) — so probe execution, not just presence.
"$PYBIN" --version >/dev/null 2>&1 || PYBIN="/c/Program Files/Python312/python.exe"
"$PYBIN" --version >/dev/null 2>&1 || { echo "ERROR: no working python3 (set PYTHON_BIN)" >&2; exit 1; }
# A native Windows python cannot read MSYS /tmp or /e/... paths — translate.
to_winpath() {
  if command -v cygpath >/dev/null 2>&1; then cygpath -w "$1"; else printf '%s' "$1"; fi
}
"$PYBIN" - "$(to_winpath "$PKG_TMP")" "$(to_winpath "$ARTIFACTS/${CC}-ccaas.tar.gz")" <<'EOF'
import sys, tarfile, gzip, io
tmp, out = sys.argv[1], sys.argv[2]
def reset(ti):
    ti.mtime = 1767225600  # 2026-01-01
    ti.uid = ti.gid = 0
    ti.uname = ti.gname = ""
    return ti
with open(tmp + "/code.tar.gz", "wb") as f:
    with gzip.GzipFile(filename="", mode="wb", fileobj=f, mtime=0) as gz:
        with tarfile.open(fileobj=gz, mode="w") as t:
            t.add(tmp + "/code/connection.json", arcname="connection.json", filter=reset)
with open(out, "wb") as f:
    with gzip.GzipFile(filename="", mode="wb", fileobj=f, mtime=0) as gz:
        with tarfile.open(fileobj=gz, mode="w") as t:
            for name in ("metadata.json", "code.tar.gz"):
                t.add(tmp + "/" + name, arcname=name, filter=reset)
EOF
rm -rf "$PKG_TMP"
echo "Package: $ARTIFACTS/${CC}-ccaas.tar.gz"

# ── 2. Install on all three peers ─────────────────────────────────────────────
install_peer() {
  local ORG_ID="$1"
  local ORG_NUM="$2"
  local PEER_ADDR="$3"
  local CONTAINER="cypherid-peer0-org${ORG_NUM}"

  echo "Installing $CC on $CONTAINER ..."
  docker exec \
    -e CORE_PEER_LOCALMSPID="$ORG_ID" \
    -e CORE_PEER_MSPCONFIGPATH="$CRYPTO/peerOrganizations/org${ORG_NUM}.cypherid.com/users/Admin@org${ORG_NUM}.cypherid.com/msp" \
    -e CORE_PEER_ADDRESS="$PEER_ADDR" \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE="$CRYPTO/peerOrganizations/org${ORG_NUM}.cypherid.com/tlsca/tlsca.org${ORG_NUM}.cypherid.com-cert.pem" \
    "$CONTAINER" peer lifecycle chaincode install "/opt/artifacts/${CC}-ccaas.tar.gz"
}

install_peer Org1MSP 1 peer0.org1.cypherid.com:7051
install_peer Org2MSP 2 peer0.org2.cypherid.com:8051
install_peer Org3MSP 3 peer0.org3.cypherid.com:9051

# ── 3. Resolve the package ID ─────────────────────────────────────────────────
PACKAGE_ID="$(docker exec \
  -e CORE_PEER_LOCALMSPID=Org1MSP \
  -e CORE_PEER_MSPCONFIGPATH="$CRYPTO/peerOrganizations/org1.cypherid.com/users/Admin@org1.cypherid.com/msp" \
  -e CORE_PEER_ADDRESS=peer0.org1.cypherid.com:7051 \
  -e CORE_PEER_TLS_ENABLED=true \
  -e CORE_PEER_TLS_ROOTCERT_FILE="$CRYPTO/peerOrganizations/org1.cypherid.com/tlsca/tlsca.org1.cypherid.com-cert.pem" \
  cypherid-peer0-org1 peer lifecycle chaincode queryinstalled \
  | sed -n "s/.*Package ID: \(${CC}_${VERSION}:[^,]*\), Label:.*/\1/p" | head -1)"

if [ -z "$PACKAGE_ID" ]; then
  echo "ERROR: could not determine package ID for ${CC}_${VERSION}" >&2
  exit 1
fi
echo "Package ID: $PACKAGE_ID"

# ── 4. Start the chaincode server (needs the package ID as CHAINCODE_ID) ──────
echo "Starting chaincode server $SERVER ..."
docker rm -f "$SERVER" >/dev/null 2>&1 || true
docker run -d --name "$SERVER" \
  --network cypherid_cypherid-net \
  --restart unless-stopped \
  -e CHAINCODE_ID="$PACKAGE_ID" \
  -e CORE_CHAINCODE_ID_NAME="$PACKAGE_ID" \
  -e CHAINCODE_SERVER_ADDRESS="$SERVER:7052" \
  -e CHAINCODE_SERVER_PORT=7052 \
  -v "$ROOT/blockchain/chaincode/$CC_DIR/build/libs/$JAR:/opt/cc/chaincode.jar:ro" \
  eclipse-temurin:21-jre \
  java -jar /opt/cc/chaincode.jar --ccaas
sleep 8
docker logs "$SERVER" 2>&1 | tail -n 3

# ── 5. Approve for each org ───────────────────────────────────────────────────
approve_org() {
  local ORG_ID="$1"
  local ORG_NUM="$2"
  local PEER_ADDR="$3"

  echo "Approving $CC definition for $ORG_ID ..."
  docker exec \
    -e CORE_PEER_LOCALMSPID="$ORG_ID" \
    -e CORE_PEER_MSPCONFIGPATH="$CRYPTO/peerOrganizations/org${ORG_NUM}.cypherid.com/users/Admin@org${ORG_NUM}.cypherid.com/msp" \
    -e CORE_PEER_ADDRESS="$PEER_ADDR" \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE="$CRYPTO/peerOrganizations/org${ORG_NUM}.cypherid.com/tlsca/tlsca.org${ORG_NUM}.cypherid.com-cert.pem" \
    "cypherid-peer0-org${ORG_NUM}" peer lifecycle chaincode approveformyorg \
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
  cypherid-peer0-org1 peer lifecycle chaincode commit \
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

echo "Chaincode $CC deployed as-a-service (sequence $SEQUENCE)."
