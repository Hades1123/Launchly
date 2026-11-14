'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BriefcaseBusiness } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import type { AdminJob } from '@launchly/shared';
import { MODERATION_DATE_FORMAT } from '@/components/admin/pending-company-list';
import { useJobText } from '@/components/recruiter/job-status-badge';
import { Card } from '@/components/ui/card';
import { listAdminJobs } from '@/lib/api/admin-jobs';
import { authErrorMessage } from '@/lib/auth-helpers';

type State =
  { kind: 'loading' } | { kind: 'error'; error: unknown } | { kind: 'ready'; jobs: AdminJob[] };

/** Submitted jobs, oldest first, each linking to its review page. */
export function PendingJobList() {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const t = useTranslations('admin');
  const tErrors = useTranslations('errors');
  const format = useFormatter();
  const jobText = useJobText();

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const jobs = await listAdminJobs('PENDING');
        if (active) setState({ kind: 'ready', jobs });
      } catch (error) {
        if (active) setState({ kind: 'error', error });
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  if (state.kind === 'loading') {
    return <div className="h-24 animate-pulse rounded-card bg-surface-muted" />;
  }
  if (state.kind === 'error') {
    return (
      <p role="alert" className="text-sm text-danger">
        {authErrorMessage(state.error, tErrors)}
      </p>
    );
  }
  if (state.jobs.length === 0) {
    return (
      <Card>
        <p className="text-sm text-muted-foreground">{t('moderation.empty')}</p>
      </Card>
    );
  }

  return (
    <section aria-labelledby="pending-jobs" className="space-y-3">
      <h2 id="pending-jobs" className="font-display text-lg font-semibold text-foreground">
        {t('pendingJobs.heading')}
      </h2>
      <ul className="space-y-3">
        {state.jobs.map((job) => (
          <li key={job.id}>
            <Card className="flex items-center gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-surface-muted text-primary">
                <BriefcaseBusiness className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/admin/moderation/jobs/${job.id}`}
                  className="rounded-control font-semibold text-foreground hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {jobText.title(job.title)}
                </Link>
                <p className="text-sm text-muted-foreground">{job.companyName}</p>
                <p className="text-xs text-subtle-foreground">{jobText.meta(job)}</p>
              </div>
              <p className="shrink-0 text-xs text-subtle-foreground">
                {t('moderation.submittedAt', {
                  date: format.dateTime(new Date(job.updatedAt), MODERATION_DATE_FORMAT),
                })}
              </p>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
