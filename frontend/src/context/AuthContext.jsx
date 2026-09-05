import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('cypherid_access_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api.me().then(setUser).catch(() => localStorage.removeItem('cypherid_access_token')).finally(() => setLoading(false));
  }, []);

  const login = async (did, password) => {
    const data = await api.login(did, password);
    localStorage.setItem('cypherid_access_token', data.accessToken);
    const me = await api.me();
    setUser(me);
    return me;
  };

  const logout = async () => {
    try { await api.logout(); } catch { /* ignore */ }
    localStorage.removeItem('cypherid_access_token');
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
