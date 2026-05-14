import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { api, setToken } from './api';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const token = localStorage.getItem('collabhub_token');
      if (!token) {
        if (mounted) setLoading(false);
        return;
      }
      try {
        const me = await api<AuthUser>('/auth/me');
        if (mounted) setUser(me);
      } catch {
        setToken(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<{ token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(res.token);
    setUser(res.user);
  }, []);

  const register = useCallback(
    async (email: string, name: string, password: string) => {
      const res = await api<{ token: string; user: AuthUser }>(
        '/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({ email, name, password }),
        },
      );
      setToken(res.token);
      setUser(res.user);
    },
    [],
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
