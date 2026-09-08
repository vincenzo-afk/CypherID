/**
 * CypherID load test — implements the targets in
 * docs/performance/01_PERFORMANCE_REQUIREMENTS.md against the api-gateway.
 *
 * Requires k6 (https://k6.io) — not bundled in this repo/environment.
 * Run:
 *   k6 run -e BASE_URL=http://localhost:8080 \
 *           -e TEST_DID=did:cypherid:0x... -e TEST_PASSWORD=... \
 *           infrastructure/performance/load-test.js
 *
 * Thresholds below are the response-time (p95) targets from the docs table.
 * Throughput targets (Fabric TPS, concurrent protected sessions, Kafka
 * events/sec) are infrastructure-level metrics this HTTP-layer script
 * cannot observe directly — see docs/performance/01_PERFORMANCE_REQUIREMENTS.md
 * "Throughput Targets" for how those should be measured against the
 * Fabric peers / Kafka brokers directly.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const TEST_DID = __ENV.TEST_DID || 'did:cypherid:0xTEST';
const TEST_PASSWORD = __ENV.TEST_PASSWORD || 'CypherID@2026!';

// One Trend per documented operation so each gets its own p95 threshold.
const loginTrend = new Trend('login_duration', true);
const didResolveTrend = new Trend('did_resolve_duration', true);
const accessEvalTrend = new Trend('access_eval_duration', true);
const assetQueryTrend = new Trend('asset_query_duration', true);
const auditQueryTrend = new Trend('audit_query_duration', true);

export const options = {
  scenarios: {
    steady_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 }, // > 10 concurrent users, matching
        { duration: '2m', target: 10 },  // the "> 10 concurrent protected sessions" target
        { duration: '30s', target: 0 }
      ]
    }
  },
  thresholds: {
    // docs/performance/01_PERFORMANCE_REQUIREMENTS.md — Response Time Targets (p95)
    login_duration: ['p(95)<500'],
    did_resolve_duration: ['p(95)<300'],
    access_eval_duration: ['p(95)<1000'],
    asset_query_duration: ['p(95)<300'],
    audit_query_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.01']
  }
};

export default function () {
  // 1. Login — target < 500ms (p95)
  const loginRes = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ did: TEST_DID, password: TEST_PASSWORD, nonce: `k6-${__VU}-${__ITER}` }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  loginTrend.add(loginRes.timings.duration);
  check(loginRes, { 'login succeeded': (r) => r.status === 200 });

  let accessToken;
  try {
    accessToken = loginRes.json('accessToken');
  } catch {
    accessToken = null;
  }
  if (!accessToken) {
    // Can't exercise authenticated endpoints without a token; skip the rest
    // of this iteration rather than reporting misleading auth-failure latencies.
    sleep(1);
    return;
  }
  const authHeaders = { headers: { Authorization: `Bearer ${accessToken}` } };

  // 2. DID resolution — target < 300ms (p95)
  const resolveRes = http.get(
    `${BASE_URL}/api/v1/identity/did/${encodeURIComponent(TEST_DID)}`,
    authHeaders
  );
  didResolveTrend.add(resolveRes.timings.duration);
  check(resolveRes, { 'DID resolve ok': (r) => r.status === 200 });

  // 3. Access evaluation (chaincode round-trip) — target < 1000ms (p95)
  const accessRes = http.post(
    `${BASE_URL}/api/v1/access/request`,
    JSON.stringify({ resourceId: 'DRDO-DOC-007', action: 'READ', context: {} }),
    { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` } }
  );
  accessEvalTrend.add(accessRes.timings.duration);
  check(accessRes, { 'access eval responded': (r) => r.status === 200 || r.status === 403 });

  // 4. Asset metadata query — target < 300ms (p95)
  const assetsRes = http.get(`${BASE_URL}/api/v1/assets`, authHeaders);
  assetQueryTrend.add(assetsRes.timings.duration);
  check(assetsRes, { 'asset list ok': (r) => r.status === 200 });

  // 5. Audit log query — target < 1000ms (p95)
  const auditRes = http.get(`${BASE_URL}/api/v1/audit/logs?size=20`, authHeaders);
  auditQueryTrend.add(auditRes.timings.duration);
  check(auditRes, { 'audit query ok': (r) => r.status === 200 });

  sleep(1);
}
