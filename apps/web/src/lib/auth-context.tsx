'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, type AuthResult, type AuthTokens, type AuthUser } from './api';

const STORAGE_KEY = 'nairaflow.auth';

interface AuthState {
  user: AuthUser | null;
  tokens: AuthTokens | null;
}

interface AuthContextValue extends AuthState {
  isLoading: boolean;
  setSession: (result: AuthResult) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, tokens: null });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState(JSON.parse(raw) as AuthState);
    } catch {
      /* ignore corrupt storage */
    }
    setIsLoading(false);
  }, []);

  const setSession = useCallback((result: AuthResult) => {
    const next = { user: result.user, tokens: result.tokens };
    setState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const logout = useCallback(async () => {
    if (state.tokens) {
      try {
        await api.logout(state.tokens.accessToken, state.tokens.refreshToken);
      } catch {
        /* best-effort revoke */
      }
    }
    setState({ user: null, tokens: null });
    localStorage.removeItem(STORAGE_KEY);
  }, [state.tokens]);

  const value = useMemo(
    () => ({ ...state, isLoading, setSession, logout }),
    [state, isLoading, setSession, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
