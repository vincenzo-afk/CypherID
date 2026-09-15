# CypherID — complete run guide (run.md)

Everything done to get this project running, written so a fresh machine can
reproduce it. One file to run: **`bash run.sh`** (add `--with-fabric` for the
real blockchain network). No demo data is ever seeded (`demo/demo.sh` is
manual/opt-in and was never executed here).

- Local frontend: http://localhost:3000
- Local backend: http://localhost:8080 (`/api/v1/health`)
- Public URL (ngrok, single tunnel → frontend; API via `/api/*`):
  https://frederica-cathodoluminescent-tendenciously.ngrok-free.dev
- Admin login — DID: `did:cypherid:admin:root`, password: `CypherID@Admin2026!`
  (auto-seeded on first boot; user temp password for created accounts:
  `CypherID@2026!`)

---

## 1. New-device quickstart

### 1.1 Prerequisites

| Need | Notes |
|---|---|
| Docker Desktop (4.x) | Linux containers. The stack is ~15 containers; 8 GB+ free RAM recommended |
| Git + bash | git-bash on Windows is fine (scripts assume it) |
| JDK 21 | Only for `--with-fabric` (chaincode jars via `./gradlew`) |
| Python 3 | Only for `--with-fabric` (deterministic ccaas packaging; script falls back to `C:\Program Files\Python312\python.exe`) |
| Ports free | 3000 (frontend), 8080 (gateway), 7050-9054 (fabric), 5432/6379/9092/5001 (infra) |
| Disk | ~15 GB free for images + builds. If C: is full, see §2 (E: layout) |

No local Postgres/Redis/Kafka/Node needed — everything runs in Docker.

### 1.2 Run it

```bash
git clone https://github.com/vincenzo-afk/CypherID.git
cd CypherID

# Base stack: infra + 5 Java services + frontend, no demo, no Fabric.
# First run takes ~15-25 min (image builds); later runs reuse cache.
bash run.sh --no-ngrok

# …or WITH the real 3-org Fabric network (adds ~30-45 min first time):
bash run.sh --no-ngrok --with-fabric

# Public URL (needs a free ngrok token):
NGROK_AUTHTOKEN=<token> bash run.sh --no-build
```

What `run.sh` does, in order (idempotent — safe to re-run):
1. Sets npm cache + Gradle home to E: (this machine; harmless elsewhere), ensures helper dirs.
2. Starts Docker Desktop if the daemon is unreachable; waits ~2 min.
3. `docker compose up -d --build` (or plain `up -d` with `--no-build`).
4. With `--with-fabric`: downloads Fabric 2.5.9 tools if missing → `start-network.sh`
   (crypto + containers) → `create-channel.sh` → `join-channel.sh` → builds the 3
   chaincode jars → `deploy-cc-aas.sh` ×3 → restarts backend services to connect.
5. Polls gateway health (≤6 min) and frontend HTTP 200.
6. Starts ONE ngrok tunnel (`cypherid` → `:3000`) and prints the public URL
   (frontend nginx proxies `/api/*` to the gateway, so one URL serves UI + API).

### 1.3 First login + users

1. Open http://localhost:3000 → Login with the admin DID/password above.
2. Admin Panel → **Create User**: name, employee ID, org, department → one-time
   DID + temp password + private key (copy now; key is never stored).
3. New users log in with their DID + `CypherID@2026!`.
4. Asset Hub → upload mints on-chain (needs Fabric); owner Views without a
   policy; others need an Admin-created policy or get `403 ACCESS_DENIED_*`.

### 1.4 Health cheat-sheet

- `curl http://localhost:8080/api/v1/health` → `UP` (fabric peer UP) or
  `DEGRADED` + `FABRIC_UNAVAILABLE` (no-fabric mode — by design).
- `docker compose ps` → all services healthy (fabric ones only with profile).
- ngrok dashboard: http://localhost:4040
- Playwright live sweep: `cd frontend && npx playwright test --config playwright.live.config.js`
  (uses installed Chrome; 20/20 green at time of writing).

---

## 2. This machine's story (E: drive, full C:)

- `docker compose ps` failed: Docker Desktop daemon down
  (`dockerDesktopLinuxEngine` unreachable). `com.docker.service` was STOPPED
  and `net start` was denied — launched `Docker Desktop.exe` directly, daemon came up.
- `C:` was 100% full (242G/0 free) → pulls died with TLS timeouts + containerd
  I/O errors. Moved everything heavy to E: (616G free):
  - `npm config set cache E:\.npm-cache`; `GRADLE_USER_HOME` already `E:\.gradle`.
  - Copied `docker_data.vhdx` → `E:\docker-data\disk\`, replaced
    `...\wsl\disk` with a directory **junction** (`mklink /J` — file symlinks
    need admin, junctions don't). All Docker writes land on E: now.
  - ngrok → `E:\tools\ngrok\`; Fabric tools → `E:\tools\fabric\`; logs → `/e/docker-data/`.

## 3. Build fixes (base stack)

- Build context grew past 169MB/450s: root `.dockerignore` had `node_modules`
  (top-level only), so `frontend/node_modules` (~204MB) shipped to every
  service build. Added `**/node_modules`, `**/dist` → 310kB/0.1s.
- 4/5 backend builds failed on transient Maven `log4j` download + a buildkit
  grpc crash from 5 parallel Gradle JVMs. Added
  `RUN --mount=type=cache,target=/root/.gradle` to all 5 backend Dockerfiles
  (shared dep cache) and built sequentially: first ~3 min, rest ~1 min each.
- Pinned `ipfs/kubo:latest` → `v0.29.0`: the `latest` layers were corrupt from
  the disk-full window (`exec format error`, even `version` printed nothing).
- Gateway crash: two `KeyResolver` beans, no `-parameters` metadata →
  `@Primary` on `didKeyResolver` (routes already select beans explicitly).
- Verified: 5 Java services + frontend healthy; health `DEGRADED` only for
  Fabric (expected); frontend 200; zero demo data.

## 4. Playwright sweep + real bugs found

Wrote `frontend/e2e/live-sweep.spec.js` (real login, all 11 routes, JS-error +
console-error + blank-page assertions; `playwright.live.config.js` uses the
machine's Chrome — Playwright's CDN download times out here). Found and fixed:

1. **Login impossible — `/me` 403.** Gateway's public `/auth/**` route skipped
   JWT, so `/me` arrived headerless and identity 403'd. Split `/me` into its
   own `JwtAuthFilter` route (first match wins).
2. **Every 500 disguised as empty 403.** `denyAll()` also blocked the servlet
   ERROR dispatch in all 4 secured services. Added
   `.dispatcherTypeMatchers(ERROR).permitAll()` ×4.
3. **DID resolve 403.** Fabric-down threw generic error → honest `503
   FABRIC_UNAVAILABLE` now (new identity exception package mirroring
   access-service) + **local-DB fallback** so known DIDs still resolve without
   Fabric; unknown DIDs 503.
4. **Audit logs 403.** JPQL `:param IS NULL` with null Instants → Postgres
   `42P18`. Rewrote as JPA Specification (never binds nulls).
5. **`/assets` page dead.** Vite `dist/assets/` made nginx 301 `/assets` to
   the wrong port. `assetsDir: 'static'`.
6. **Auth errors mis-coded.** Wrong password → 403, then 500 after fix #2.
   New `AuthenticationException` → 401 INVALID_CREDENTIALS / 403
   DID_REVOKED/DID_SUSPENDED per the API docs; JwtException → 401.
7. Smaller: `ngrok-skip-browser-warning` header, DID trim on login, wallet
   "Blockchain unavailable" message, audit/identity `GlobalExceptionHandler`s.

## 5. Assets + users (on-chain era)

- Upload worked, **View 403→503**: `AccessEvaluationClient` treated the
  access service's 403-DENIED as outage (RestTemplate throws on 4xx, so the
  403 branch was dead code). Now `HttpStatusCodeException` → `ForbiddenException`
  → honest 403 with reason.
- **Owner bypass**: owners open their own uploads without a policy (ownership
  verified on-chain); everyone else goes through policy evaluation
  (default-deny, unchanged).
- **Admin Create-User panel**: name/employee/org/dept → on-chain DID +
  one-time temp password + private key with copy buttons.
- AssetHub UI: fabric warning banner, disabled actions while down, severity
  alerts, spinner + retry, upload-in-progress state.
- Viewer 401: `/protected-content/chunk` + `/session-info` take Bearer
  **session** tokens, but the gateway demanded user JWT. Split into a
  no-JWT-filter route (IP rate-limited; downstream validates the token).

## 6. Phase 2 — the REAL Fabric network (no demo)

Brought up 1 orderer (Raft) + 3 peers + 3 CouchDB + 3 CAs, channel
`cypherid-channel`, 3 Java chaincodes committed (identity seq 2,
accesscontrol/assetregistry seq 1, AND-all-3-orgs endorsement):

- Tools: Fabric 2.5.9 windows binaries → `E:\tools\fabric\bin`.
- `configtx.yaml`: `AND('Org1MSP.peer',...)` is invalid ImplicitMeta →
  `ALL Endorsement` (same intent).
- Compose: quoted-JSON `*_ROOTCAS` → plain paths; dropped partial `CLUSTER_*`
  (solo orderer); peer `CHAINCODEADDRESS 0.0.0.0` → hostnames; `cypherid-net`
  DNS aliases (cypherid.com is a REAL domain — names hit AWS IPs); ccaas dir
  mounted into peer0-org1.
- Scripts: `peer0-orgN` → `cypherid-peer0-orgN`; `MSYS_NO_PATHCONV=1`
  (git-bash mangles container paths); stop script removes cc servers;
  `peer-ca.crt` bundles all 3 org TLS CAs (AND-policy dials all orgs).
- Windows cryptogen writes backslash MSP paths — fixed to slashes.
- Deploy is **ccaas** (`deploy-cc-aas.sh`, new): the 2.5 peer image ships only
  the ccaas builder. Packages hand-crafted (`type: ccaas`, root
  connection.json) with deterministic Python tarballs. Mains support
  `--ccaas` server mode; servers `cypherid-cc-*` with `CORE_CHAINCODE_ID_NAME`.
- Contracts needed `@DataType`/`@Property` on every model (NPE otherwise).
- Backend: grpc-netty `1.61.1→1.83.1`, `protobuf-java:4.29.3`,
  `-Dnetworkaddress.cache.ttl=30` on all 5 services (JDK caches DNS forever).
- **Verified live**: DID `did:cypherid:0x16c3...` (tx `4b79ab2b...`); asset
  `ASSET-c307d3ab...` + IPFS `QmNQLs...` (tx `a00350d8...`); policy (tx
  `2a338f...`); on-chain resolve + list 200; health `UP`.

## 7. Troubleshooting (hit at least once here)

| Symptom | Cause | Fix |
|---|---|---|
| `dockerDesktopLinuxEngine` unreachable | Docker Desktop down | Launch `Docker Desktop.exe`, wait for `docker version` |
| TLS timeout / containerd I/O on pull | Disk full | Free space / move Docker data (junction), retry |
| Context hundreds of MB, build crawls | `.dockerignore` misses nested dirs | `**/node_modules`, `**/dist` |
| Maven jar download fails in build | Transient Central blip | Re-run (cache mounts make retries cheap) |
| `frontend grpc server closed` | 5 parallel Gradle JVMs OOM buildkit | Build sequentially |
| `exec format error` (ipfs) | Corrupt layers from disk-full pull | `rmi` + re-pull / pin version |
| Login 403, then 500 | Wrong password + error-mapping bugs | Correct password; 401s now per docs |
| `no combination of peers` | Package ID mismatch across peers | Deterministic packages; approve/commit one ID |
| `no such container peer0-org1` | Compose prefixes names | Use `cypherid-` names in scripts |
| `C:/Program Files/Git/etc/...` in container paths | MSYS path conversion | `MSYS_NO_PATHCONV=1` |
| Endorsement TLS failures | Single-org CA bundle | Bundle all 3 org TLS CAs |
| Gateway dials dead IPs after recreate | JDK infinite DNS cache | `-Dnetworkaddress.cache.ttl=30` |
| ngrok `ERR_NGROK_334` / shared URL | Free plan = 1 static domain | Single tunnel → frontend only |
| Browser API 403 via ngrok | Missing skip header | `ngrok-skip-browser-warning: true` |

## 8. Files changed (all committed)

- `run.sh` — one-shot runner (+`--with-fabric`); `run.md` — this file
- `.dockerignore` (`**/node_modules`, `**/dist`), `.gitignore` (`**/bin/`)
- `docker-compose.yml` — ipfs pin, fabric TLS/cluster/chaincode-addr fixes, DNS aliases, ccaas mount
- `backend/*/Dockerfile` — gradle cache mounts + DNS TTL
- `backend/{identity,access,asset}/build.gradle` — grpc 1.83.1 + protobuf 4.29.3
- Gateway — `@Primary` KeyResolver; `auth-me` + `protected-content-session` route splits
- 4× `SecurityConfig` — ERROR-dispatch permit
- identity — exception package (FabricUnavailable, Authentication, handlers), local-fallback resolve, 401/403 auth codes
- audit — exception package, Specification search fix
- asset — 503 mapping, 403 mapping, owner bypass; access — 503 mapping
- Chaincode mains — `--ccaas` server mode; all models — `@DataType`/`@Property`
- Fabric — `configtx.yaml` policy, `ccaas/*/connection.json` (new), `deploy-cc-aas.sh` (new), script name/path fixes, stop-network cleanup
- Frontend — ngrok header, DID trim, wallet message, AssetHub rework, Admin Create-User, `vite.assetsDir`, `e2e/live-sweep.spec.js` + `playwright.live.config.js` (new)
