'use client';

import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { useState } from 'react';
import { AuthFeedback } from '@/components/auth/auth-ui';
import { useAuth } from '@/lib/auth-context';
import { authErrorMessage } from '@/lib/auth-helpers';

export function AuthHeaderActions() {
  const { status, user, logout, error: sessionError } = useAuth();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (status === 'loading') {
    return (
      <span
        aria-label="Đang tải phiên đăng nhập"
        className="size-8 animate-pulse rounded-full bg-surface-muted"
      />
    );
  }

  if (status !== 'authenticated' || !user) {
    return (
      <div className="flex items-center gap-2">
        {status === 'unavailable' && (
          <span className="max-w-40 text-right text-xs text-danger" role="status">
            {sessionError ?? 'Không thể khôi phục phiên đăng nhập.'}
          </span>
        )}
        <Link
          href="/login"
          className="rounded-control px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Đăng nhập
        </Link>
        <Link
          href="/register"
          className="rounded-control bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Tạo tài khoản
        </Link>
      </div>
    );
  }

  const displayName = user.fullName?.trim() || user.email;
  const initials = displayName
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  async function handleLogout() {
    setPending(true);
    setLogoutError(null);
    try {
      await logout();
    } catch (cause) {
      setLogoutError(authErrorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative flex items-center gap-2 pl-2">
      <div className="hidden text-right 2xl:block">
        <div className="max-w-40 truncate font-display text-sm leading-tight font-semibold">
          {displayName}
        </div>
        <div className="text-xs text-subtle-foreground">
          {user.role === 'CANDIDATE'
            ? 'Ứng viên'
            : user.role === 'RECRUITER'
              ? 'Nhà tuyển dụng'
              : 'Quản trị viên'}
        </div>
      </div>
      <span
        aria-label={displayName}
        title={displayName}
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-xs font-semibold text-primary-subtle-foreground ring-2 ring-primary-subtle"
      >
        {initials || '?'}
      </span>
      <button
        type="button"
        onClick={() => void handleLogout()}
        disabled={pending}
        aria-label="Đăng xuất"
        title="Đăng xuất"
        className="rounded-control p-2 text-muted-foreground transition hover:bg-secondary hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60"
      >
        <LogOut className="size-5" strokeWidth={1.75} aria-hidden />
      </button>
      {logoutError && (
        <div className="absolute top-full right-0 z-10 mt-2 w-72">
          <AuthFeedback tone="error">{logoutError}</AuthFeedback>
        </div>
      )}
    </div>
  );
}
