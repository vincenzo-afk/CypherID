import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockAxiosInstance } = vi.hoisted(() => {
  const mockAxiosInstance = {
    get: vi.fn(() => Promise.resolve({ data: {} })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
    interceptors: { request: { use: vi.fn() } }
  };
  return { mockAxiosInstance };
});

vi.mock('axios', () => ({
  default: { create: vi.fn(() => mockAxiosInstance) }
}));

import { api, apiClient } from './api.js';

describe('api service', () => {
  beforeEach(() => {
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
});
