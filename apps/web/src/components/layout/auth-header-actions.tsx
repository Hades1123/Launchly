'use client';

import Link from 'next/link';
import { UserMenu } from '@/components/layout/user-menu';
import { useAuth } from '@/lib/auth-context';

export function AuthHeaderActions() {
  const { status, user, error: sessionError } = useAuth();

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

  return <UserMenu user={user} />;
}
