import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '';

export const apiClient = axios.create({
  baseURL: BASE,
  timeout: 15000
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('cypherid_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const api = {
  login: (did, password) =>
    apiClient.post('/api/v1/auth/login', { did, password, nonce: crypto.randomUUID() }).then((r) => r.data),
  refresh: () => apiClient.post('/api/v1/auth/refresh').then((r) => r.data),
  logout: () => apiClient.post('/api/v1/auth/logout').then((r) => r.data),
  me: () => apiClient.get('/api/v1/auth/me').then((r) => r.data),

  createDID: (body) => apiClient.post('/api/v1/identity/dids', body).then((r) => r.data),
  resolveDID: (did) => apiClient.get(`/api/v1/identity/dids/${encodeURIComponent(did)}`).then((r) => r.data),

  createPolicy: (body) => apiClient.post('/api/v1/access/policies', body).then((r) => r.data),
  evaluateAccess: (body) => apiClient.post('/api/v1/access/evaluate', body).then((r) => r.data),

  uploadAsset: (formData) =>
    apiClient.post('/api/v1/assets', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),
  assetHistory: (assetId) => apiClient.get(`/api/v1/assets/${assetId}/history`).then((r) => r.data),

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

  auditTrail: (params) => apiClient.get('/api/v1/audit/trail', { params }).then((r) => r.data)
};
