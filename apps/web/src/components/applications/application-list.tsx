'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { CandidateApplicationItem } from '@launchly/shared';
import { ApplicationRow } from '@/components/applications/application-row';
import { buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { listMyApplications } from '@/lib/api/applications';
import { ApiError } from '@/lib/api/http';
import { useAuth } from '@/lib/auth-context';

function Notice({ children }: { children: React.ReactNode }) {
  return <Card className="space-y-3 text-sm text-muted-foreground">{children}</Card>;
}

export function ApplicationList({ openId }: { openId?: string }) {
  const t = useTranslations('candidate.applications.list');
  const { status, user } = useAuth();
  const [items, setItems] = useState<CandidateApplicationItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isCandidate = status === 'authenticated' && user?.role === 'CANDIDATE';

  useEffect(() => {
    if (!isCandidate) return;
    let active = true;
    listMyApplications()
      .then((list) => active && setItems(list.data))
      .catch(
        (cause) => active && setError(cause instanceof ApiError ? cause.message : t('loadError')),
      );
    return () => {
      active = false;
    };
  }, [isCandidate, t]);

  if (status === 'loading') return <Notice>{t('loading')}</Notice>;
  if (status !== 'authenticated') {
    return (
      <Notice>
        <Link href="/login?next=%2Fapplications" className={buttonClasses('primary')}>
          {t('logIn')}
        </Link>
      </Notice>
    );
  }
  if (!isCandidate) return <Notice>{t('candidatesOnly')}</Notice>;
  if (error) return <Notice>{error}</Notice>;
  if (!items) return <Notice>{t('loading')}</Notice>;

  if (items.length === 0) {
    return (
      <Notice>
        <p>{t('empty')}</p>
        <Link href="/jobs" className={buttonClasses('primary')}>
          {t('browseJobs')}
        </Link>
      </Notice>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <ApplicationRow key={item.id} application={item} initiallyOpen={item.id === openId} />
      ))}
    </div>
  );
}
