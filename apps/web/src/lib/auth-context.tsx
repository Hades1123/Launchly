'use client';

import type { UserDto } from '@launchly/shared';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getCurrentUser, logout as logoutRequest, refreshSession } from '@/lib/api/auth';
import { ApiError, setAccessToken, setSessionExpiredHandler } from '@/lib/api/http';

type AuthStatus = 'loading' | 'anonymous' | 'authenticated' | 'unavailable';

type AuthContextValue = {
  status: AuthStatus;
  user: UserDto | null;
  error: string | null;
  acceptSession: (accessToken: string, user: UserDto) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Holds the signed-in user. The access token itself lives in `lib/api/http`,
 * which attaches it to every request and refreshes it on 401.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<UserDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const acceptSession = useCallback((token: string, currentUser: UserDto) => {
    setAccessToken(token);
    setUser(currentUser);
    setError(null);
    setStatus('authenticated');
  }, []);

  const endSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setError(null);
    setStatus('anonymous');
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(endSession);
    return () => setSessionExpiredHandler(null);
  }, [endSession]);

  // Restore the session from the refresh cookie on first load.
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { accessToken } = await refreshSession();
        const currentUser = await getCurrentUser();
        if (active) acceptSession(accessToken, currentUser);
      } catch (cause) {
        if (!active) return;
        if (cause instanceof ApiError && cause.status === 401) {
          endSession();
        } else {
          setError(
            cause instanceof ApiError ? cause.message : 'Không thể khôi phục phiên đăng nhập.',
          );
          setStatus('unavailable');
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [acceptSession, endSession]);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      endSession();
    }
  }, [endSession]);

  const value = useMemo(
    () => ({ status, user, error, acceptSession, logout }),
    [acceptSession, error, logout, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
