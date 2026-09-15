#!/usr/bin/env bash
# CypherID one-shot runner — frontend + backend, no demo data.
# Usage:
#   bash run.sh [--no-build] [--no-ngrok] [--ngrok-token <token>] [--with-fabric]
#
# What it does:
#   1. Moves caches to E: (npm) and ensures E:\tools / E:\docker-data exist
#   2. Starts Docker Desktop if the daemon is unreachable
#   3. docker compose up -d --build  (infra + 5 Java services + frontend)
#      Skipped with --no-build (just starts existing containers)
#   3b. With --with-fabric: the REAL 3-org Fabric network (orderer + 3 peers
#      + channel + 3 Java ccaas chaincodes). First run adds ~30-45 min.
#      WITHOUT it the stack still runs; /api/v1/health reports DEGRADED with
#      FABRIC_UNAVAILABLE and chaincode features degrade (wallet falls back to
#      local store, assets/policy calls 503). See run.md §10b.
#   4. Waits for gateway health http://localhost:8080/api/v1/health
#      and frontend http://localhost:3000 (HTTP 200)
#   5. Opens one ngrok tunnel for the frontend (:3000, /api/* proxied to the
#      gateway) and prints the public URL. Needs NGROK_AUTHTOKEN env var
#      (get one free at https://dashboard.ngrok.com/get-started/your-authtoken)
#      or pass --ngrok-token. Skipped with --no-ngrok.
#
# Requirements: Docker Desktop (Windows), project checked out on E:
# (C: is full — everything heavy lives on E: by design).
# For --with-fabric additionally: JDK 21 (for the gradlew chaincode builds),
# git-bash (MSYS_NO_PATHCONV is exported by the scripts themselves), and a
# working python3 for deterministic ccaas packaging (the script falls back to
# C:\Program Files\Python312\python.exe on Windows).

set -u

# ── args ──────────────────────────────────────────────────────────────
DO_BUILD=1
DO_NGROK=1
DO_FABRIC=0
NGROK_TOKEN="${NGROK_AUTHTOKEN:-}"
while [ $# -gt 0 ]; do
  case "$1" in
    --no-build) DO_BUILD=0; shift ;;
    --no-ngrok) DO_NGROK=0; shift ;;
    --with-fabric) DO_FABRIC=1; shift ;;
    --ngrok-token) NGROK_TOKEN="$2"; shift 2 ;;
    *) echo "Unknown arg: $1 (see header comments)"; exit 1 ;;
  esac
done

cd "$(dirname "$0")"

# ── 0. E: drive setup (C: is full, never write heavy stuff there) ─────
mkdir -p /e/.npm-cache /e/docker-data /e/tools/ngrok
npm config set cache "E:\.npm-cache" --global >/dev/null 2>&1 || true
export GRADLE_USER_HOME="E:\.gradle"

NGROK_BIN=""
for c in "/e/tools/ngrok/ngrok.exe" "$(which ngrok 2>/dev/null)"; do
  if [ -n "$c" ] && [ -x "$c" ]; then NGROK_BIN="$c"; break; fi
done

# ── 1. Docker daemon ──────────────────────────────────────────────────
if ! docker version >/dev/null 2>&1; then
  echo "[run] starting Docker Desktop..."
  nohup "/c/Program Files/Docker/Docker/Docker Desktop.exe" >/tmp/docker-desktop.log 2>&1 &
  for _ in $(seq 1 24); do
    docker version >/dev/null 2>&1 && break
    sleep 5
  done
  docker version >/dev/null 2>&1 || { echo "[run] Docker did not start. Open Docker Desktop manually and re-run."; exit 1; }
fi
echo "[run] docker OK: $(docker version --format '{{.Server.Version}}' 2>/dev/null)"

# ── 2. Compose up (no demo seed, no fabric profile — plain stack) ─────
if [ "$DO_BUILD" -eq 1 ]; then
  echo "[run] building + starting stack (first run takes ~15-25 min, later runs reuse cache)..."
  docker compose up -d --build || { echo "[run] compose build failed — see output above"; exit 1; }
else
  echo "[run] starting existing containers (no build)..."
  docker compose up -d || exit 1
fi

# ── 3b. Real Fabric network (opt-in via --with-fabric) ────────────────
if [ "$DO_FABRIC" -eq 1 ]; then
  export MSYS_NO_PATHCONV=1
  # Fabric 2.5 CLI tools (cryptogen/configtxgen/peer/osnadmin). Repo scripts
  # expect them on PATH. Reuse $FABRIC_TOOLS_DIR or download once.
  FABRIC_TOOLS_DIR="${FABRIC_TOOLS_DIR:-/e/tools/fabric}"
  if ! command -v cryptogen >/dev/null 2>&1; then
    if [ -x "$FABRIC_TOOLS_DIR/bin/cryptogen" ]; then
      export PATH="$FABRIC_TOOLS_DIR/bin:$PATH"
    else
      echo "[run] downloading Fabric 2.5.9 tools to $FABRIC_TOOLS_DIR ..."
      mkdir -p "$FABRIC_TOOLS_DIR"
      case "$(uname -s)" in
        MINGW*|MSYS*|CYGWIN*) FAB_TGZ="hyperledger-fabric-windows-amd64-2.5.9.tar.gz" ;;
        Linux*)               FAB_TGZ="hyperledger-fabric-linux-amd64-2.5.9.tar.gz" ;;
        Darwin*)              FAB_TGZ="hyperledger-fabric-darwin-amd64-2.5.9.tar.gz" ;;
        *) echo "[run] unknown OS for fabric tools download; install cryptogen+configtxgen manually"; exit 1 ;;
      esac
      curl -sL --max-time 300 -o "$FABRIC_TOOLS_DIR/fabric-tools.tar.gz" \
        "https://github.com/hyperledger/fabric/releases/download/v2.5.9/$FAB_TGZ" \
        || { echo "[run] fabric tools download failed"; exit 1; }
      tar -xzf "$FABRIC_TOOLS_DIR/fabric-tools.tar.gz" -C "$FABRIC_TOOLS_DIR"
      export PATH="$FABRIC_TOOLS_DIR/bin:$PATH"
    fi
  fi
  command -v cryptogen >/dev/null 2>&1 || { echo "[run] cryptogen still missing"; exit 1; }

  # Java chaincode builds need JDK 21 (shadowJar via the repo wrapper).
  if ! ./gradlew --version >/dev/null 2>&1; then
    echo "[run] gradlew needs a JDK — install JDK 21 and re-run"; exit 1
  fi

  # Chaincode server images.
  docker pull eclipse-temurin:21-jre >/dev/null 2>&1 || echo "[run] warning: temurin pull failed (needed for cc servers)"

  echo "[run] Phase 2a: crypto + fabric containers (start-network.sh)..."
  bash infrastructure/scripts/start-network.sh || exit 1
  echo "[run] Phase 2b: channel create + join..."
  bash infrastructure/scripts/create-channel.sh || exit 1
  bash infrastructure/scripts/join-channel.sh || exit 1

  echo "[run] Phase 2c: building chaincode jars (one gradle invocation)..."
  ./gradlew :blockchain:chaincode:identity:shadowJar \
            :blockchain:chaincode:access-control:shadowJar \
            :blockchain:chaincode:asset-registry:shadowJar --no-daemon || exit 1
  # Deploy script expects the x.y jar names (gradle emits x.y.z).
  cp blockchain/chaincode/identity/build/libs/identity-chaincode-*.0.0.jar \
     blockchain/chaincode/identity/build/libs/identity-chaincode-1.0.jar 2>/dev/null || true
  cp blockchain/chaincode/access-control/build/libs/access-control-chaincode-*.0.0.jar \
     blockchain/chaincode/access-control/build/libs/access-control-chaincode-1.0.jar 2>/dev/null || true
  cp blockchain/chaincode/asset-registry/build/libs/asset-registry-chaincode-*.0.0.jar \
     blockchain/chaincode/asset-registry/build/libs/asset-registry-chaincode-1.0.jar 2>/dev/null || true

  echo "[run] Phase 2d: deploying chaincodes (ccaas, ~5 min each)..."
  for cc in identity accesscontrol assetregistry; do
    bash infrastructure/scripts/deploy-cc-aas.sh "$cc" || exit 1
  done
  echo "[run] fabric online — restarting backend services to connect..."
  docker compose up -d --force-recreate identity-svc access-svc asset-svc || exit 1
fi

# ── 3. Wait for health ────────────────────────────────────────────────
echo "[run] waiting for backend (max ~6 min for Spring Boot boot)..."
BACKEND_OK=0
for _ in $(seq 1 72); do
  if curl -sf --max-time 5 http://localhost:8080/api/v1/health >/dev/null 2>&1; then BACKEND_OK=1; break; fi
  sleep 5
done
[ "$BACKEND_OK" -eq 1 ] || { echo "[run] backend never became healthy"; docker compose ps; exit 1; }
echo "[run] backend: $(curl -s --max-time 10 http://localhost:8080/api/v1/health | head -c 200)"

echo "[run] waiting for frontend..."
FRONT_OK=0
for _ in $(seq 1 24); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:3000/ 2>/dev/null)
  if [ "$CODE" = "200" ]; then FRONT_OK=1; break; fi
  sleep 5
done
[ "$FRONT_OK" -eq 1 ] || { echo "[run] frontend never returned 200"; docker compose ps; exit 1; }
echo "[run] frontend: http://localhost:3000 (200)"

# NOTE: /api/v1/health reports status DEGRADED while the Fabric network is
# down (FABRIC_UNAVAILABLE). That is by design — Fabric is a Phase-2
# optional profile: docker compose --profile fabric up -d (needs crypto
# material from infrastructure/scripts/start-network.sh). No demo data is
# ever seeded by this script (demo/demo.sh is manual/opt-in).

# ── 4. ngrok tunnels ──────────────────────────────────────────────────
if [ "$DO_NGROK" -eq 1 ]; then
  if [ -z "$NGROK_BIN" ]; then
    echo "[run] ngrok not found — download to E:\\tools\\ngrok or install it, then re-run (or --no-ngrok)."
  elif [ -z "$NGROK_TOKEN" ]; then
    echo "[run] NGROK_AUTHTOKEN not set — skipping public URLs."
    echo "      Get a free token: https://dashboard.ngrok.com/get-started/your-authtoken"
    echo "      Then: NGROK_AUTHTOKEN=<token> bash run.sh --no-build   (or --ngrok-token <token>)"
  else
    # One agent, two tunnels (free accounts share a single static domain —
    # two separate agents fight over it with ERR_NGROK_334, so never do that).
    "$NGROK_BIN" config add-authtoken "$NGROK_TOKEN" >/dev/null 2>&1 || true
    powershell.exe -Command "Get-Process ngrok -ErrorAction SilentlyContinue | Stop-Process -Force" >/dev/null 2>&1 || true
    sleep 2
    NGROK_CFG="/e/docker-data/ngrok.yml"
    printf 'version: 2\nweb_addr: 127.0.0.1:4040\ntunnels:\n  cypherid:\n    proto: http\n    addr: 3000\n' > "$NGROK_CFG"
    NGROK_CFG_WIN="E:\\docker-data\\ngrok.yml"
    nohup "$NGROK_BIN" start --all --config "$NGROK_CFG_WIN" --log /e/docker-data/ngrok.log >/dev/null 2>&1 &
    echo "[run] waiting for ngrok tunnel..."
    PUBLIC_URL=""
    for _ in $(seq 1 12); do
      sleep 5
      PUBLIC_URL=$(curl -s --max-time 5 http://localhost:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"https://[^"]*"' | head -n 1 | sed 's/"public_url":"//;s/"//')
      [ -n "$PUBLIC_URL" ] && break
    done
    echo "================================================================"
    echo "  Frontend (local):  http://localhost:3000"
    echo "  Backend  (local):  http://localhost:8080"
    echo "  Public URL:        ${PUBLIC_URL:-<tunnel failed, see /e/docker-data/ngrok.log>}"
    echo "    UI  (public):    ${PUBLIC_URL:-<failed>}/"
    echo "    API (public):    ${PUBLIC_URL:-<failed>}/api/v1/health  (nginx proxies /api/* to gateway)"
    echo "  ngrok dashboard:   http://localhost:4040"
    echo "================================================================"
  fi
else
  echo "[run] ngrok skipped (--no-ngrok). Local URLs: frontend http://localhost:3000, backend http://localhost:8080"
fi

echo "[run] DONE — stack is up without demo data."
