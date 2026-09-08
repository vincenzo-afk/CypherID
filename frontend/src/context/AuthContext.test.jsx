import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('../services/api.js', () => ({
  api: {
    login: vi.fn(),
    logout: vi.fn(),
    me: vi.fn()
  }
}));

import { api } from '../services/api.js';
import { AuthProvider, useAuth } from './AuthContext.jsx';

function Probe() {
  const { user, loading, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.did : 'none'}</span>
      <button onClick={() => login('did:cypherid:user1', 'secret')}>login</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('with no stored token, finishes loading with no user and never calls api.me()', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('user').textContent).toBe('none');
    expect(api.me).not.toHaveBeenCalled();
  });

  it('with a stored token, fetches the user on mount', async () => {
    localStorage.setItem('cypherid_access_token', 'existing-token');
    api.me.mockResolvedValue({ did: 'did:cypherid:user1' });

    render(<AuthProvider><Probe /></AuthProvider>);

    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('did:cypherid:user1'));
    expect(api.me).toHaveBeenCalledTimes(1);
  });

  it('with a stored token that no longer resolves, clears the token and stays logged out', async () => {
    localStorage.setItem('cypherid_access_token', 'stale-token');
    api.me.mockRejectedValue(new Error('401'));

    render(<AuthProvider><Probe /></AuthProvider>);

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('user').textContent).toBe('none');
    expect(localStorage.getItem('cypherid_access_token')).toBeNull();
  });

  it('login() stores the access token and populates the user from api.me()', async () => {
    api.login.mockResolvedValue({ accessToken: 'new-access-token' });
    api.me.mockResolvedValue({ did: 'did:cypherid:user1' });

    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    screen.getByText('login').click();

    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('did:cypherid:user1'));
    expect(localStorage.getItem('cypherid_access_token')).toBe('new-access-token');
    expect(api.login).toHaveBeenCalledWith('did:cypherid:user1', 'secret');
  });

  it('logout() clears the token and user even if api.logout() rejects', async () => {
    localStorage.setItem('cypherid_access_token', 'existing-token');
    api.me.mockResolvedValue({ did: 'did:cypherid:user1' });
    api.logout.mockRejectedValue(new Error('network error'));

    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('did:cypherid:user1'));

    screen.getByText('logout').click();

    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('none'));
    expect(localStorage.getItem('cypherid_access_token')).toBeNull();
  });
});
