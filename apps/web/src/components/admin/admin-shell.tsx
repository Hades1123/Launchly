'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { BrandLogo } from '@/components/layout/brand-logo';
import { buttonClasses } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';

function GuardCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4">
      <BrandLogo />
      <div className="w-full max-w-md rounded-card bg-surface p-6 text-center shadow-card">
        {children}
      </div>
    </div>
  );
}

/** Admin area: only admins get past it. The API enforces the role as well. */
export function AdminShell({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  const pathname = usePathname();

  if (status === 'loading') {
    return (
      <GuardCard>
        <p className="text-sm text-muted-foreground">Đang tải…</p>
      </GuardCard>
    );
  }
  if (status !== 'authenticated' || !user) {
    return (
      <GuardCard>
        <p className="text-sm text-muted-foreground">Vui lòng đăng nhập bằng tài khoản quản trị.</p>
        <Link
          href={`/login?next=${encodeURIComponent(pathname)}`}
          className={buttonClasses('primary', 'mt-4')}
        >
          Đăng nhập
        </Link>
      </GuardCard>
    );
  }
  if (user.role !== 'ADMIN') {
    return (
      <GuardCard>
        <p className="font-semibold text-foreground">Khu vực dành cho quản trị viên</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Tài khoản của bạn không có quyền truy cập trang này.
        </p>
        <Link href="/jobs" className={buttonClasses('soft', 'mt-4')}>
          Về trang việc làm
        </Link>
      </GuardCard>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-surface shadow-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <BrandLogo />
            <span className="text-xs font-semibold tracking-wide text-subtle-foreground uppercase">
              Quản trị
            </span>
          </div>
          <Link href="/jobs" className={buttonClasses('ghost')}>
            <ArrowLeft className="size-4" aria-hidden />
            Về trang việc làm
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">{children}</main>
    </div>
  );
}
