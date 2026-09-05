#!/usr/bin/env bash
# Phase 2 — Stop the Fabric network and clean up generated artifacts.
# (docs/infrastructure/03_FABRIC_NETWORK_DEPLOYMENT.md)
#
# Stops the Fabric containers (keeps their data volumes) and removes the
# generated crypto material, channel artifacts, and service admin config.
# Run start-network.sh afterwards to regenerate everything.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FABRIC_DIR="$ROOT/infrastructure/fabric"

echo "Stopping Fabric containers ..."
(cd "$ROOT" && docker compose --profile fabric down)

echo "Removing generated material under $FABRIC_DIR ..."
rm -rf "$FABRIC_DIR/crypto-config" \
       "$FABRIC_DIR/artifacts" \
       "$FABRIC_DIR/config"

echo "Fabric network stopped and cleaned."