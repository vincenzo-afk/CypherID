#!/usr/bin/env bash
# Phase 2 — Start the Hyperledger Fabric network.
# (docs/infrastructure/03_FABRIC_NETWORK_DEPLOYMENT.md)
#
# Steps:
#   1. Generate crypto material          (cryptogen)
#   2. Generate genesis block + channel tx (configtxgen)
#   3. Prepare the TLS + admin identity material used by the Java services
#   4. Start the Fabric containers       (docker compose --profile fabric)
#
# Prerequisites: cryptogen, configtxgen (Fabric 2.5 binaries), docker compose.
#   cryptogen/configtxgen are NOT shipped in this repo — install the
#   hyperledger/fabric-tools binaries or run them inside a tools container.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FABRIC_DIR="$ROOT/infrastructure/fabric"
CRYPTO_CONFIG="$FABRIC_DIR/crypto-config"
ARTIFACTS="$FABRIC_DIR/artifacts"
SERVICE_CONFIG="$FABRIC_DIR/config"

# ── 0. Prerequisites ──────────────────────────────────────────────────────────
for bin in cryptogen configtxgen; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "ERROR: '$bin' not found on PATH." >&2
    echo "Install the Hyperledger Fabric 2.5 tools, or add them to PATH." >&2
    exit 1
  fi
done
if ! docker compose version >/dev/null 2>&1; then
  echo "ERROR: docker compose is required." >&2
  exit 1
fi

mkdir -p "$ARTIFACTS" \
         "$SERVICE_CONFIG/tls" \
         "$SERVICE_CONFIG/admin/keystore" \
         "$SERVICE_CONFIG/admin/signcerts"

# ── 1. Crypto material ────────────────────────────────────────────────────────
if [ -d "$CRYPTO_CONFIG/peerOrganizations" ]; then
  echo "Crypto material already present — skipping cryptogen."
  echo "Delete $CRYPTO_CONFIG to regenerate."
else
  echo "Generating crypto material with cryptogen ..."
  (cd "$FABRIC_DIR" && cryptogen generate --config=crypto-config.yaml --output=crypto-config)
fi

# ── 2. Genesis block + channel tx + anchor peer tx ───────────────────────────
echo "Generating system-channel genesis block ..."
configtxgen -profile CypherIDGenesis -channelID system-channel \
  -outputBlock "$ARTIFACTS/genesis.block" -configPath "$FABRIC_DIR"

echo "Generating cypherid-channel creation tx ..."
configtxgen -profile CypherIDChannel \
  -outputCreateChannelTx "$ARTIFACTS/channel.tx" -channelID cypherid-channel \
  -configPath "$FABRIC_DIR"

for ORG in Org1MSP Org2MSP Org3MSP; do
  echo "Generating anchor peer update tx for $ORG ..."
  configtxgen -profile CypherIDChannel \
    -outputAnchorPeersUpdate "$ARTIFACTS/${ORG}anchors.tx" \
    -channelID cypherid-channel -asOrg "$ORG" -configPath "$FABRIC_DIR"
done

# ── 3. Service TLS + admin material ───────────────────────────────────────────
# The Java gateway clients (identity/access/asset) read the Org1 peer TLS CA
# cert and Org1 admin identity from /config/fabric/* (see FabricConnectionConfig).
# Copy the real cryptogen output there so the services can connect over TLS.
ORG1_MSP="$CRYPTO_CONFIG/peerOrganizations/org1.cypherid.com"
TLSCA_CERT="$ORG1_MSP/tlsca/tlsca.org1.cypherid.com-cert.pem"
ADMIN_MSP="$ORG1_MSP/users/Admin@org1.cypherid.com/msp"

[ -f "$TLSCA_CERT" ] || { echo "ERROR: $TLSCA_CERT not found" >&2; exit 1; }
[ -f "$ADMIN_MSP/signcerts/Admin@org1.cypherid.com-cert.pem" ] || \
  { echo "ERROR: Org1 admin cert not found" >&2; exit 1; }

cp "$TLSCA_CERT" "$SERVICE_CONFIG/tls/peer-ca.crt"
cp "$ADMIN_MSP/signcerts/Admin@org1.cypherid.com-cert.pem" \
   "$SERVICE_CONFIG/admin/signcerts/admin.pem"

SK_FILE="$(find "$ADMIN_MSP/keystore" -maxdepth 1 -name '*_sk' | head -1)"
[ -n "$SK_FILE" ] || { echo "ERROR: Org1 admin signing key not found" >&2; exit 1; }
cp "$SK_FILE" "$SERVICE_CONFIG/admin/keystore/admin_sk"

# ── 4. Start containers ───────────────────────────────────────────────────────
echo "Starting Fabric network containers ..."
(cd "$ROOT" && docker compose --profile fabric up -d)

echo
echo "Fabric network started. Next steps:"
echo "  ./infrastructure/scripts/create-channel.sh"
echo "  ./infrastructure/scripts/join-channel.sh"
echo "  ./infrastructure/scripts/deploy-chaincode.sh identity"
echo "  ./infrastructure/scripts/deploy-chaincode.sh accesscontrol"
echo "  ./infrastructure/scripts/deploy-chaincode.sh assetregistry"