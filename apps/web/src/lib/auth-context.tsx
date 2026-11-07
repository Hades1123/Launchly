'use client';

import {
  accessTokenResponseSchema,
  userDtoSchema,
  type UserDto,
} from '@launchly/shared';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authRequest, authRequestNoContent, AuthRequestError } from '@/lib/auth-api';

type AuthStatus = 'loading' | 'anonymous' | 'authenticated' | 'unavailable';

type AuthContextValue = {
  status: AuthStatus;
  accessToken: string | null;
  user: UserDto | null;
  error: string | null;
  acceptSession: (accessToken: string, user: UserDto, expiresIn: number) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
let refreshInFlight: Promise<{ accessToken: string; expiresIn: number }> | null = null;

function refreshAccessToken() {
  if (refreshInFlight) return refreshInFlight;
  const pending = authRequest('/refresh', accessTokenResponseSchema, {
    method: 'POST',
  }).then(({ accessToken, expiresIn }) => ({ accessToken, expiresIn }));
  const shared = pending.finally(() => {
    if (refreshInFlight === shared) refreshInFlight = null;
  });
  refreshInFlight = shared;
  return shared;
}

async function getCurrentUser(accessToken: string) {
  return authRequest('/me', userDtoSchema, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserDto | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const acceptSession = useCallback((token: string, currentUser: UserDto, expiresIn: number) => {
    setAccessToken(token);
    setUser(currentUser);
    setExpiresAt(Date.now() + expiresIn * 1000);
    setError(null);
    setStatus('authenticated');
  }, []);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setExpiresAt(null);
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const refreshed = await refreshAccessToken();
        const currentUser = await getCurrentUser(refreshed.accessToken);
        if (active) acceptSession(refreshed.accessToken, currentUser, refreshed.expiresIn);
      } catch (cause) {
        if (!active) return;
        if (cause instanceof AuthRequestError && cause.status === 401) {
          clearSession();
          setStatus('anonymous');
        } else {
          setError(
            cause instanceof AuthRequestError
              ? cause.message
              : 'Không thể khôi phục phiên đăng nhập.',
          );
          setStatus('unavailable');
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [acceptSession, clearSession]);

  useEffect(() => {
    if (status !== 'authenticated' || !expiresAt) return;
    const delay = Math.max(1000, expiresAt - Date.now() - 60_000);
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const refreshed = await refreshAccessToken();
          const currentUser = await getCurrentUser(refreshed.accessToken);
          acceptSession(refreshed.accessToken, currentUser, refreshed.expiresIn);
        } catch (cause) {
          clearSession();
          if (cause instanceof AuthRequestError && cause.status === 401) {
            setError(null);
            setStatus('anonymous');
          } else {
            setError(
              cause instanceof AuthRequestError
                ? cause.message
                : 'Không thể gia hạn phiên đăng nhập.',
            );
            setStatus('unavailable');
          }
        }
      })();
    }, delay);
    return () => window.clearTimeout(timer);
  }, [acceptSession, clearSession, expiresAt, status]);

  const logout = useCallback(async () => {
    if (accessToken) {
      await authRequestNoContent('/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    }
    clearSession();
    setError(null);
    setStatus('anonymous');
  }, [accessToken, clearSession]);

  const value = useMemo(
    () => ({ status, accessToken, user, error, acceptSession, logout }),
    [acceptSession, accessToken, error, logout, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
