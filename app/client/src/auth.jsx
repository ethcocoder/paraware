import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { api, getToken, setToken } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const data = await api('/auth/me');
      setUser(data.user);
      return data.user;
    } catch (error) {
      // Only a real auth rejection ends the session. A network hiccup on a
      // phone must not silently sign the user out.
      if (error.status === 401 || error.status === 403) {
        setToken(null);
        setUser(null);
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const onSignOut = () => setUser(null);
    window.addEventListener('paraware:signed-out', onSignOut);
    return () => window.removeEventListener('paraware:signed-out', onSignOut);
  }, [refresh]);

  const login = useCallback(async (identifier, password) => {
    const data = await api('/auth/login', {
      method: 'POST',
      body: { identifier, password },
    });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await api('/auth/register', {
      method: 'POST',
      body: payload,
    });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((next) => {
    setUser((current) => ({ ...current, ...next }));
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refresh, updateUser }),
    [user, loading, login, register, logout, refresh, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
