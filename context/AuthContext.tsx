import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { BlogUser } from '@/types/blog';
import { fetchJson, TOKEN_KEY } from '@/lib/blog';

type AuthContextValue = {
  user: BlogUser | null;
  token: string | null;
  loading: boolean;
  login: (token: string) => Promise<void>;
  register: (token: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function loadUser(token: string) {
  return fetchJson<BlogUser>('/api/auth/me', {}, token);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<BlogUser | null>(null);
  const [loading, setLoading] = useState(true);

  const syncUser = useCallback(async (nextToken: string | null) => {
    if (!nextToken) {
      setUser(null);
      setToken(null);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(TOKEN_KEY);
      }
      return;
    }

    setToken(nextToken);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(TOKEN_KEY, nextToken);
    }

    const currentUser = await loadUser(nextToken);
    setUser(currentUser);
  }, []);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      const storedToken =
        typeof window === 'undefined'
          ? null
          : window.localStorage.getItem(TOKEN_KEY);

      if (!storedToken) {
        if (active) {
          setLoading(false);
        }
        return;
      }

      try {
        await syncUser(storedToken);
      } catch {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(TOKEN_KEY);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    bootstrap();

    return () => {
      active = false;
    };
  }, [syncUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      login: async (nextToken: string) => {
        await syncUser(nextToken);
      },
      register: async (nextToken: string) => {
        await syncUser(nextToken);
      },
      logout: () => {
        setUser(null);
        setToken(null);
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(TOKEN_KEY);
        }
      },
      refreshUser: async () => {
        if (token) {
          const currentUser = await loadUser(token);
          setUser(currentUser);
        }
      },
    }),
    [loading, syncUser, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }

  return context;
}