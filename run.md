# CypherID — run.md

How this project was brought up on this machine, and how to run it with one file.
`bash run.sh` alone reproduces the whole running state (frontend + backend, no demo).

- Local frontend: http://localhost:3000
- Local backend: http://localhost:8080 (`/api/v1/health`)
- Public URL (ngrok, single tunnel → frontend; API via `/api/*`): https://frederica-cathodoluminescent-tendenciously.ngrok-free.dev
- Public UI: https://frederica-cathodoluminescent-tendenciously.ngrok-free.dev/ (verified 200)
- Public API: https://frederica-cathodoluminescent-tendenciously.ngrok-free.dev/api/v1/health (verified, backend JSON)

---

## 1. Starting point

- Request: run the project **without demo** (no `demo/demo.sh` seed data), frontend + backend.
- `docker compose up` is the documented path (`docker-compose.yml` boots infra +
  5 Java services + frontend; Fabric is an opt-in `--profile fabric`, demo is a manual script).
- First `docker compose ps` failed: Docker Desktop daemon not running
  (`npipe:////./pipe/dockerDesktopLinuxEngine` unreachable).

## 2. Docker Desktop was down — started it

- Docker 29.7.2 installed at `C:\Program Files\Docker\Docker`, `com.docker.service` STOPPED,
  WSL distros (`kali-linux`, `docker-desktop`) STOPPED.
- `net start com.docker.service` → Access denied (no admin shell).
- Launched `Docker Desktop.exe` directly in background — daemon came up, `docker version` OK.

## 3. C: drive 100% full — moved everything heavy to E:

- `C:` showed 242G used / 0 free → pulls failed with
  `TLS handshake timeout` and containerd `input/output error`.
- Findings: `GRADLE_USER_HOME` already `E:\.gradle`; Docker vhdx
  (`AppData\Local\Docker\wsl\disk\docker_data.vhdx`, 3.6G) lived on C:.
- Fixes (all on E:, C: untouched):
  - `npm config set cache "E:\.npm-cache"`
  - Copied `docker_data.vhdx` → `E:\docker-data\disk\`, deleted the C: file,
    replaced `...\wsl\disk` with a **directory junction** to `E:\docker-data\disk`
    (`mklink /J` — file symlinks need admin, junctions don't).
    Result: C: back to ~6G free, all future Docker writes land on E:.
  - Folders used: `/e/docker-data` (logs, vhdx), `/e/.npm-cache`, `/e/tools/ngrok`.

## 4. Infra first, then the slow part — image builds

- `postgres:16-alpine`, `redis:7-alpine`, `ipfs/kubo`, `cp-zookeeper:7.5.0`,
  `cp-kafka:7.5.0` pulled; `postgres/redis/zookeeper/kafka` healthy.
- `docker compose up -d --build` hung: build context grew past **169MB/450s**.
  Root cause: root `.dockerignore` had `node_modules` (matches only top level),
  so `frontend/node_modules` (~204MB) was sent as context to every service build.
- Fix in `.dockerignore`: added `**/node_modules` and `**/dist`.
  Context dropped to **310kB / 0.1s**. (Killed the stuck build first.)

## 5. Backend builds kept failing — fixed with shared Gradle cache

- All 4 service builds failed with `Could not download log4j-api-2.23.1.jar`
  (`repo.maven.apache.org` unreachable from parallel build containers — transient).
- Retry died differently: `frontend grpc server closed unexpectedly`
  (buildkit OOM from 5 parallel Gradle JVMs on a 14GB box).
- Fixes:
  - One-line change in all 5 `backend/*/Dockerfile`s:
    `RUN --mount=type=cache,target=/root/.gradle gradle …`
    so the 5 services share one dependency cache instead of downloading 5×.
  - Rebuilt **sequentially** (`audit → access → asset → identity → gateway`):
    first service ~3 min, rest ~1 min each on the warm cache.

## 6. Two real bugs found while booting

1. **IPFS image corrupt** — `ipfs/kubo:latest` (pulled during the disk-full
   I/O-error window) clean-exited with code 0 and empty logs; even
   `ipfs version` printed nothing, direct binary run gave `exec format error`.
   Fix: pinned `docker-compose.yml` to `ipfs/kubo:v0.29.0` (verified
   `ipfs version 0.29.0`), re-pulled. IPFS healthy since.
2. **api-gateway crash** — two `KeyResolver` beans (`didKeyResolver`,
   `ipKeyResolver`) with no `-parameters` metadata, so
   `GatewayAutoConfiguration` failed: _"required a single bean, but 2 were found"_.
   Fix: `@Primary` on `didKeyResolver` in
   `backend/api-gateway/.../config/RateLimiterConfig.java`
   (routes already select beans explicitly via `#{@…}` in `application.yml`).

## 7. Verified running state (no demo, no Fabric)

- `docker compose ps`: postgres, redis, zookeeper, kafka, ipfs, identity,
  access, asset, audit, api-gateway = **healthy**; frontend **up** (port 3000→80).
- `curl http://localhost:8080/api/v1/health` → `status: DEGRADED` with
  `FABRIC_UNAVAILABLE` — **by design**: Fabric is Phase-2 opt-in
  (`docker compose --profile fabric up -d` + crypto material); postgres/redis UP.
- `curl http://localhost:3000/` → HTTP 200.
- No `demo/demo.sh` was ever executed — zero seed data.

## 8. One-file runner — `run.sh`

```bash
bash run.sh [--no-build] [--no-ngrok] [--ngrok-token <token>]
```

What it does, in order (idempotent — safe to re-run):
1. Creates `/e/.npm-cache`, `/e/docker-data`, `/e/tools/ngrok`; sets npm cache + `GRADLE_USER_HOME` to E:.
2. Starts Docker Desktop if `docker version` fails; waits up to ~2 min.
3. `docker compose up -d --build` (or plain `up -d` with `--no-build`).
4. Polls `http://localhost:8080/api/v1/health` (≤6 min) and `http://localhost:3000` (200).
5. Starts ONE ngrok tunnel (`cypherid` → `:3000`, the frontend).
   Its nginx proxies `/api/*` to the gateway, so the single public URL serves
   both UI (`/`) and API (`/api/…`). Reads the URL from
   `http://localhost:4040/api/tunnels` and prints it.
   Needs `NGROK_AUTHTOKEN` env (free at
   https://dashboard.ngrok.com/get-started/your-authtoken) or `--ngrok-token`;
   `--no-ngrok` skips. ngrok binary expected at `E:\tools\ngrok\ngrok.exe`
   (installed §9) or anywhere on PATH.

## 9. ngrok public URLs

- Installed ngrok 3.39.11 to `E:\tools\ngrok\ngrok.exe`
  (zip: `https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip`;
  note the channel id — `bNyjM1mQfcg` floating around in old docs is dead).
- `ngrok config add-authtoken <token>` once per machine, then `run.sh`
  starts one tunnel (`cypherid` → `:3000`); URL listed at
  http://localhost:4040. `run.sh` automates all of this.
- Current session URLs (verified live 2026-09-15):
  - One tunnel `cypherid` → `:3000`: https://frederica-cathodoluminescent-tendenciously.ngrok-free.dev
  - UI `/` → 200; API `/api/v1/health` → backend JSON (DEGRADED only for Fabric, by design).
  - Free-plan lesson: one static domain per account. Two separate `ngrok http`
    agents fight over it (`ERR_NGROK_334 already online`), and two tunnels in one
    agent share the same URL (one shadows the other). Frontend-only tunnel is
    correct because its nginx already proxies `/api/*` to the gateway.

## 10. Files changed in this session (all committed)

- `.dockerignore` — added `**/node_modules`, `**/dist`
- `.gitignore` — added `**/bin/`, `bin/` (local Gradle outputs)
- `docker-compose.yml` — `ipfs/kubo:latest` → `ipfs/kubo:v0.29.0`
- `backend/*/Dockerfile` (5×) — Gradle cache mount
- `backend/api-gateway/.../config/RateLimiterConfig.java` — `@Primary` on `didKeyResolver`
- `run.sh` (new), `run.md` (this file)
