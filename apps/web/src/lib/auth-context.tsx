'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, type AuthResult, type AuthUser } from './api';

const STORAGE_KEY = 'nairaflow.access';

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  setSession: (result: AuthResult) => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setSession = useCallback((result: AuthResult) => {
    setUser(result.user);
    setAccessToken(result.tokens.accessToken);
    // Persist only the access token for fast first paint; the refresh token
    // lives in an httpOnly cookie the browser manages for us.
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: result.user }));
  }, []);

  const refresh = useCallback(async () => {
    const result = await api.refresh();
    setSession(result);
  }, [setSession]);

  const logout = useCallback(async () => {
    if (accessToken) {
      try {
        await api.logout(accessToken);
      } catch {
        /* best-effort */
      }
    }
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem(STORAGE_KEY);
  }, [accessToken]);

  // On load, hydrate the session from the refresh cookie (survives reloads).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await api.refresh();
        if (!cancelled) setSession(result);
      } catch {
        if (!cancelled) {
          setUser(null);
          setAccessToken(null);
          localStorage.removeItem(STORAGE_KEY);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setSession]);

  const value = useMemo(
    () => ({ user, accessToken, isLoading, setSession, refresh, logout }),
    [user, accessToken, isLoading, setSession, refresh, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
