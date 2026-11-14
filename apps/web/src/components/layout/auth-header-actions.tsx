'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { UserMenu } from '@/components/layout/user-menu';
import { buttonClasses } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';

export function AuthHeaderActions() {
  const t = useTranslations('layout.auth');
  const { status, user, error: sessionError } = useAuth();

  if (status === 'loading') {
    return (
      <span
        aria-label={t('loadingSession')}
        className="size-8 animate-pulse rounded-full bg-surface-muted"
      />
    );
  }

  if (status !== 'authenticated' || !user) {
    return (
      <div className="flex items-center gap-2">
        {status === 'unavailable' && (
          <span className="max-w-40 text-right text-xs text-danger" role="status">
            {sessionError ?? t('restoreFailed')}
          </span>
        )}
        <Link href="/login" className={buttonClasses('primary', 'whitespace-nowrap')}>
          {t('signIn')}
        </Link>
      </div>
    );
  }

  return <UserMenu user={user} />;
}
