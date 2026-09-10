import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'cypherid_access_token';

export const apiClient = axios.create({
  baseURL: BASE,
  timeout: 15000
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Global failure handling ────────────────────────────────────────────────
// Previously there was none: a 401 on any call past initial page load just
// surfaced as a raw rejected promise with nothing to recover it, 403/404/5xx
// had no consistent shape for pages to show the user, and network failures
// (no response at all — offline, gateway down, timeout) weren't
// distinguished from anything else. This adds, uniformly, for every call
// made through `api`:
//   - one-shot silent refresh-and-retry on a 401 (the access token now lasts
//     5h, but the refresh token lasts 24h — this makes the session actually
//     span that full 24h transparently instead of hard-dying at 5h with no
//     recovery)
//   - a hard redirect to /login only when refresh itself fails (i.e. the
//     session is genuinely over)
//   - a `error.friendlyMessage` on every rejected request, so pages can
//     show something readable without each reimplementing status-code
//     mapping
let refreshInFlight = null;

function friendlyMessage(status, serverMessage) {
  switch (status) {
    case 401:
      return 'Your session has expired. Please log in again.';
    case 403:
      return "You don't have permission to do that.";
    case 404:
      return 'That could not be found.';
    default:
      if (status >= 500) return 'Something went wrong on the server. Please try again.';
      return serverMessage || 'The request could not be completed.';
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;

    // No response at all — network failure, timeout, CORS, gateway down.
    if (!response) {
      error.friendlyMessage = 'Network error — check your connection and try again.';
      return Promise.reject(error);
    }

    const status = response.status;
    const url = config?.url || '';
    // Never try to "refresh" our way out of a failed login or a failed
    // refresh itself — that's not recoverable and would just loop.
    const isAuthBootstrapCall = url.includes('/api/v1/auth/login') || url.includes('/api/v1/auth/refresh');

    if (status === 401 && !isAuthBootstrapCall && config && !config._retry) {
      config._retry = true;
      try {
        // De-duplicate concurrent 401s (e.g. several widgets fetching at
        // once) into a single /refresh call instead of one each.
        if (!refreshInFlight) {
          refreshInFlight = apiClient
            .post('/api/v1/auth/refresh')
            .then((r) => r.data)
            .finally(() => { refreshInFlight = null; });
        }
        const data = await refreshInFlight;
        localStorage.setItem(TOKEN_KEY, data.accessToken);
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${data.accessToken}`;
        return apiClient(config);
      } catch (refreshError) {
        localStorage.removeItem(TOKEN_KEY);
        try {
          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.location.assign('/login');
          }
        } catch { /* navigation unavailable (e.g. test environment) — token is already cleared */ }
        refreshError.friendlyMessage = friendlyMessage(401);
        return Promise.reject(refreshError);
      }
    }

    error.friendlyMessage = friendlyMessage(status, response.data?.message);
    return Promise.reject(error);
  }
);

// Paths follow docs/api/* (source of truth per docs/AGENTS.md).
const newNonce = () => {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch { /* insecure context fallback below */ }
  return `nonce-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e12).toString(36)}`;
};

export const api = {
  login: (did, password) =>
    apiClient.post('/api/v1/auth/login', { did, password, nonce: newNonce() }).then((r) => r.data),
  refresh: () => apiClient.post('/api/v1/auth/refresh').then((r) => r.data),
  logout: () => apiClient.post('/api/v1/auth/logout').then((r) => r.data),
  me: () => apiClient.get('/api/v1/auth/me').then((r) => r.data),

  // Identity / DID (docs/api/03_IDENTITY_APIS.md)
  createDID: (body) => apiClient.post('/api/v1/identity/did', body).then((r) => r.data),
  resolveDID: (did) => apiClient.get(`/api/v1/identity/did/${encodeURIComponent(did)}`).then((r) => r.data),
  suspendDID: (did, reason) =>
    apiClient.put(`/api/v1/identity/did/${encodeURIComponent(did)}/suspend`, { reason }).then((r) => r.data),
  revokeDID: (did, reason) =>
    apiClient.put(`/api/v1/identity/did/${encodeURIComponent(did)}/revoke`, { reason }).then((r) => r.data),

  // Credentials / VC (docs/api/04_CREDENTIAL_APIS.md)
  issueCredential: (body) => apiClient.post('/api/v1/identity/credentials', body).then((r) => r.data),
  listCredentials: (did) =>
    apiClient.get(`/api/v1/identity/credentials/${encodeURIComponent(did)}`).then((r) => r.data),
  revokeCredential: (vcId) => apiClient.delete(`/api/v1/identity/credentials/${encodeURIComponent(vcId)}`).then((r) => r.data),
  verifyCredential: (vc) => apiClient.post('/api/v1/identity/credentials/verify', { vc }).then((r) => r.data),

  // Access control (docs/api/05_ACCESS_CONTROL_APIS.md, 08_POLICY_APIS.md)
  requestAccess: (body) => apiClient.post('/api/v1/access/request', body).then((r) => r.data),
  // Back-compat alias (older pages used /evaluate)
  evaluateAccess: (body) => apiClient.post('/api/v1/access/request', body).then((r) => r.data),
  createPolicy: (body) => apiClient.post('/api/v1/access/policies', body).then((r) => r.data),
  listPolicies: () => apiClient.get('/api/v1/access/policies').then((r) => r.data),
  getPolicy: (resourceId) => apiClient.get(`/api/v1/access/policies/${encodeURIComponent(resourceId)}`).then((r) => r.data),
  updatePolicy: (policyId, body) =>
    apiClient.put(`/api/v1/access/policies/${encodeURIComponent(policyId)}`, body).then((r) => r.data),
  delegateAccess: (body) => apiClient.post('/api/v1/access/delegate', body).then((r) => r.data),
  revokeDelegate: (body) => apiClient.put('/api/v1/access/delegate/revoke', body).then((r) => r.data),
  createMultiSig: (body) => apiClient.post('/api/v1/access/multisig', body).then((r) => r.data),
  approveMultiSig: (requestId, body) =>
    apiClient.post(`/api/v1/access/multisig/${encodeURIComponent(requestId)}/approve`, body).then((r) => r.data),
  accessLog: (logId) => apiClient.get(`/api/v1/access/logs/${encodeURIComponent(logId)}`).then((r) => r.data),
  emergencyOverride: (body) => apiClient.post('/api/v1/access/emergency-override', body).then((r) => r.data),

  // Assets (docs/api/06_ASSET_APIS.md)
  uploadAsset: (formData) =>
    apiClient.post('/api/v1/assets', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),
  listAssets: (ownerDID) =>
    apiClient.get('/api/v1/assets', { params: { ownerDID } }).then((r) => r.data),
  getAsset: (assetId) => apiClient.get(`/api/v1/assets/${encodeURIComponent(assetId)}`).then((r) => r.data),
  transferAsset: (assetId, body) =>
    apiClient.post(`/api/v1/assets/${encodeURIComponent(assetId)}/transfer`, body).then((r) => r.data),
  burnAsset: (assetId, body) =>
    apiClient.delete(`/api/v1/assets/${encodeURIComponent(assetId)}`, { data: body }).then((r) => r.data),
  assetHistory: (assetId) => apiClient.get(`/api/v1/assets/${encodeURIComponent(assetId)}/history`).then((r) => r.data),

  // Protected sessions / content (docs/api/09,10)
  issueProtectedSession: (assetId) => apiClient.post(`/api/v1/assets/${assetId}/protected-session`).then((r) => r.data),
  sessionInfo: (sessionToken) =>
    apiClient.get('/api/v1/protected-content/session-info', { headers: { Authorization: `Bearer ${sessionToken}` } }).then((r) => r.data),
  fetchChunk: (sessionToken, chunk) =>
    apiClient.get('/api/v1/protected-content/chunk', {
      headers: { Authorization: `Bearer ${sessionToken}` },
      params: { chunk },
      responseType: 'text'
    }).then((r) => r.data),
  logSecurityEvent: (sessionId, event) =>
    apiClient.post(`/api/v1/protected-content/session/${sessionId}/event`, event).then((r) => r.data),
  closeSession: (sessionId) => apiClient.delete(`/api/v1/protected-content/session/${sessionId}`).then((r) => r.data),

  // Exams / video (docs/api/13,14)
  startExam: (examId) => apiClient.post(`/api/v1/exams/${encodeURIComponent(examId)}/session`).then((r) => r.data),
  examQuestion: (sessionId, questionIndex = 0) =>
    apiClient.get('/api/v1/exams/question', { params: { sessionId, questionIndex } }).then((r) => r.data),
  submitAnswer: (body) => apiClient.post('/api/v1/exams/answer', body).then((r) => r.data),
  endExam: (examId, body) => apiClient.post(`/api/v1/exams/${encodeURIComponent(examId)}/session/end`, body || {}).then((r) => r.data),
  startVideo: (videoId) => apiClient.post(`/api/v1/videos/${encodeURIComponent(videoId)}/session`).then((r) => r.data),

  // Watermark / security events (docs/api/11,12)
  watermarkLookup: (displayId) =>
    apiClient.get(`/api/v1/admin/watermark/${encodeURIComponent(displayId)}`).then((r) => r.data),
  securityEvents: () => apiClient.get('/api/v1/security/events').then((r) => r.data),

  // Notifications (docs/api/16)
  notifications: () => apiClient.get('/api/v1/notifications').then((r) => r.data),
  markNotificationRead: (id) => apiClient.put(`/api/v1/notifications/${encodeURIComponent(id)}/read`).then((r) => r.data),

  // Audit (docs/api/07)
  auditLogs: (params) => apiClient.get('/api/v1/audit/logs', { params }).then((r) => r.data),
  // Back-compat alias
  auditTrail: (params) => apiClient.get('/api/v1/audit/logs', { params }).then((r) => r.data),
  auditReport: (startDate, endDate) =>
    apiClient.get('/api/v1/audit/report', { params: { startDate, endDate }, responseType: 'blob' }).then((r) => r.data),

  // Health (docs/api/17)
  health: () => apiClient.get('/api/v1/health').then((r) => r.data),
  fabricHealth: () => apiClient.get('/api/v1/health/fabric').then((r) => r.data),

  // Admin (docs/api/15)
  registerOrganization: (body) => apiClient.post('/api/v1/admin/organizations', body).then((r) => r.data),
  listOrganizations: () => apiClient.get('/api/v1/admin/organizations').then((r) => r.data),
  assignRole: (did, body) =>
    apiClient.put(`/api/v1/admin/users/${encodeURIComponent(did)}/role`, body).then((r) => r.data)
};
