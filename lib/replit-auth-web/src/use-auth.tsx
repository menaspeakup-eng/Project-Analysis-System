import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AuthUser } from '@workspace/api-client-react';

export type { AuthUser };

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

interface ReplitAuthContextValue {
  basePath: string;
}

const ReplitAuthContext = createContext<ReplitAuthContextValue>({ basePath: '/' });

export function ReplitAuthProvider({
  children,
  basePath,
}: {
  children: ReactNode;
  basePath?: string;
}) {
  const normalized = (basePath ?? '/').replace(/\/+$/, '') || '/';
  return (
    <ReplitAuthContext.Provider value={{ basePath: normalized }}>
      {children}
    </ReplitAuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const { basePath } = useContext(ReplitAuthContext);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/auth/user', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ user: AuthUser | null }>;
      })
      .then((data) => {
        if (!cancelled) {
          setUser(data.user ?? null);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(() => {
    window.location.href = `/api/login?returnTo=${encodeURIComponent(basePath)}`;
  }, [basePath]);

  const logout = useCallback(() => {
    window.location.href = `/api/logout?returnTo=${encodeURIComponent(basePath)}`;
  }, [basePath]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
  };
}
