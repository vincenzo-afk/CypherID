#!/usr/bin/env bash
# CypherID one-shot runner — frontend + backend, no demo data, no Fabric.
# Usage:
#   bash run.sh [--no-build] [--no-ngrok] [--ngrok-token <token>]
#
# What it does:
#   1. Moves caches to E: (npm) and ensures E:\tools / E:\docker-data exist
#   2. Starts Docker Desktop if the daemon is unreachable
#   3. docker compose up -d --build  (infra + 5 Java services + frontend)
#      Skipped with --no-build (just starts existing containers)
#   4. Waits for gateway health http://localhost:8080/api/v1/health
#      and frontend http://localhost:3000 (HTTP 200)
#   5. Opens ngrok tunnels for frontend (:3000) and gateway (:8080)
#      and prints the public URLs. Needs NGROK_AUTHTOKEN env var
#      (get one free at https://dashboard.ngrok.com/get-started/your-authtoken)
#      or pass --ngrok-token. Skipped with --no-ngrok.
#
# Requirements: Docker Desktop (Windows), project checked out on E:
# (C: is full — everything heavy lives on E: by design).

set -u

# ── args ──────────────────────────────────────────────────────────────
DO_BUILD=1
DO_NGROK=1
NGROK_TOKEN="${NGROK_AUTHTOKEN:-}"
while [ $# -gt 0 ]; do
  case "$1" in
    --no-build) DO_BUILD=0; shift ;;
    --no-ngrok) DO_NGROK=0; shift ;;
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
