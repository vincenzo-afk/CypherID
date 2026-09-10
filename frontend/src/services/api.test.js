import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockAxiosInstance } = vi.hoisted(() => {
  // Axios instances are callable (apiClient(config) re-issues a request) —
  // make the mock callable too, since the response interceptor's 401 retry
  // path does exactly that.
  const mockAxiosInstance = Object.assign(
    vi.fn(() => Promise.resolve({ data: {} })),
    {
      get: vi.fn(() => Promise.resolve({ data: {} })),
      post: vi.fn(() => Promise.resolve({ data: {} })),
      put: vi.fn(() => Promise.resolve({ data: {} })),
      delete: vi.fn(() => Promise.resolve({ data: {} })),
      interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } }
    }
  );
  return { mockAxiosInstance };
});

vi.mock('axios', () => ({
  default: { create: vi.fn(() => mockAxiosInstance) }
}));

import { api, apiClient } from './api.js';

const responseErrorHandler = mockAxiosInstance.interceptors.response.use.mock.calls.at(-1)?.[1];

describe('api service', () => {
  beforeEach(() => {
    localStorage.clear();
    mockAxiosInstance.mockClear();
    mockAxiosInstance.mockResolvedValue({ data: {} });
    Object.values(mockAxiosInstance).forEach((fn) => {
      if (typeof fn === 'function' && 'mockClear' in fn) fn.mockClear();
    });
    mockAxiosInstance.get.mockResolvedValue({ data: {} });
    mockAxiosInstance.post.mockResolvedValue({ data: {} });
    mockAxiosInstance.put.mockResolvedValue({ data: {} });
    mockAxiosInstance.delete.mockResolvedValue({ data: {} });
  });

  it('exposes the axios instance created via axios.create', () => {
    expect(apiClient).toBe(mockAxiosInstance);
  });

  it('login() posts DID + password + a generated nonce', async () => {
    await api.login('did:cypherid:user1', 'secret');

    expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
    const [url, body] = mockAxiosInstance.post.mock.calls[0];
    expect(url).toBe('/api/v1/auth/login');
    expect(body.did).toBe('did:cypherid:user1');
    expect(body.password).toBe('secret');
    expect(typeof body.nonce).toBe('string');
    expect(body.nonce.length).toBeGreaterThan(0);
  });

  it('login() generates a different nonce on each call', async () => {
    await api.login('did:cypherid:user1', 'secret');
    await api.login('did:cypherid:user1', 'secret');

    const nonce1 = mockAxiosInstance.post.mock.calls[0][1].nonce;
    const nonce2 = mockAxiosInstance.post.mock.calls[1][1].nonce;
    expect(nonce1).not.toBe(nonce2);
  });

  it('resolveDID() URL-encodes the DID path segment', async () => {
    await api.resolveDID('did:cypherid:0xABC');

    expect(mockAxiosInstance.get).toHaveBeenCalledWith(
      `/api/v1/identity/did/${encodeURIComponent('did:cypherid:0xABC')}`
    );
  });

  it('suspendDID() sends the reason in the request body', async () => {
    await api.suspendDID('did:cypherid:0xABC', 'policy violation');

    expect(mockAxiosInstance.put).toHaveBeenCalledWith(
      `/api/v1/identity/did/${encodeURIComponent('did:cypherid:0xABC')}/suspend`,
      { reason: 'policy violation' }
    );
  });

  it('uploadAsset() sends multipart/form-data content type', async () => {
    const formData = new FormData();
    await api.uploadAsset(formData);

    expect(mockAxiosInstance.post).toHaveBeenCalledWith(
      '/api/v1/assets',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  });

  it('listAssets() passes ownerDID as a query param', async () => {
    await api.listAssets('did:cypherid:user1');

    expect(mockAxiosInstance.get).toHaveBeenCalledWith(
      '/api/v1/assets',
      { params: { ownerDID: 'did:cypherid:user1' } }
    );
  });

  it('fetchChunk() forwards the session token as a Bearer header', async () => {
    await api.fetchChunk('session-tok-123', 3);

    expect(mockAxiosInstance.get).toHaveBeenCalledWith(
      '/api/v1/protected-content/chunk',
      {
        headers: { Authorization: 'Bearer session-tok-123' },
        params: { chunk: 3 },
        responseType: 'text'
      }
    );
  });

  it('auditReport() requests a blob response type', async () => {
    await api.auditReport('2026-01-01', '2026-01-31');

    expect(mockAxiosInstance.get).toHaveBeenCalledWith(
      '/api/v1/audit/report',
      { params: { startDate: '2026-01-01', endDate: '2026-01-31' }, responseType: 'blob' }
    );
  });

  it('evaluateAccess() is a back-compat alias for requestAccess() hitting the same endpoint', async () => {
    await api.evaluateAccess({ resourceId: 'DRDO-DOC-007', action: 'READ' });

    expect(mockAxiosInstance.post).toHaveBeenCalledWith(
      '/api/v1/access/request',
      { resourceId: 'DRDO-DOC-007', action: 'READ' }
    );
  });

  it('markNotificationRead() PUTs to the notification id path with no body', async () => {
    await api.markNotificationRead('notif-42');

    expect(mockAxiosInstance.put).toHaveBeenCalledWith('/api/v1/notifications/notif-42/read');
  });

  // ─── response interceptor: failure handling ──────────────────────────────

  function getErrorHandler() {
    return responseErrorHandler;
  }

  it('network failure (no response) gets a friendly message and rejects', async () => {
    const handler = getErrorHandler();
    const error = {}; // axios network/timeout errors have no `.response`

    await expect(handler(error)).rejects.toBe(error);
    expect(error.friendlyMessage).toMatch(/network/i);
  });

  it('403 gets a permission-denied friendly message', async () => {
    const handler = getErrorHandler();
    const error = { config: { url: '/api/v1/admin/organizations' }, response: { status: 403, data: {} } };

    await expect(handler(error)).rejects.toBe(error);
    expect(error.friendlyMessage).toMatch(/permission/i);
  });

  it('404 gets a not-found friendly message', async () => {
    const handler = getErrorHandler();
    const error = { config: { url: '/api/v1/assets/does-not-exist' }, response: { status: 404, data: {} } };

    await expect(handler(error)).rejects.toBe(error);
    expect(error.friendlyMessage).toMatch(/not.*found|could not be found/i);
  });

  it('401 on a normal request triggers one refresh call and retries with the new token', async () => {
    const handler = getErrorHandler();
    mockAxiosInstance.post.mockResolvedValueOnce({ data: { accessToken: 'refreshed-token' } });
    mockAxiosInstance.mockResolvedValueOnce({ data: { ok: true } }); // the retried apiClient(config) call

    const config = { url: '/api/v1/assets', headers: {} };
    const error = { config, response: { status: 401, data: {} } };

    const result = await handler(error);

    expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/v1/auth/refresh');
    expect(localStorage.getItem('cypherid_access_token')).toBe('refreshed-token');
    expect(config.headers.Authorization).toBe('Bearer refreshed-token');
    expect(config._retry).toBe(true);
    expect(result).toEqual({ data: { ok: true } });
  });

  it('401 whose refresh also fails clears the token and does not retry indefinitely', async () => {
    const handler = getErrorHandler();
    mockAxiosInstance.post.mockRejectedValueOnce(new Error('refresh token expired'));
    localStorage.setItem('cypherid_access_token', 'stale-token');

    const config = { url: '/api/v1/assets', headers: {} };
    const error = { config, response: { status: 401, data: {} } };

    await expect(handler(error)).rejects.toThrow('refresh token expired');
    expect(localStorage.getItem('cypherid_access_token')).toBeNull();
  });

  it('401 on the login/refresh endpoints themselves does not attempt a refresh loop', async () => {
    const handler = getErrorHandler();
    mockAxiosInstance.post.mockClear();

    const config = { url: '/api/v1/auth/login', headers: {} };
    const error = { config, response: { status: 401, data: { message: 'Invalid credentials' } } };

    await expect(handler(error)).rejects.toBe(error);
    expect(mockAxiosInstance.post).not.toHaveBeenCalledWith('/api/v1/auth/refresh');
  });
});
