'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import type { CandidateApplicationDetail, CandidateApplicationItem } from '@launchly/shared';
import { ApplicationTimeline, DATE_FORMAT } from '@/components/applications/application-timeline';
import { StatusBadge } from '@/components/applications/status-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getMyApplication } from '@/lib/api/applications';
import { ApiError } from '@/lib/api/http';

type Details =
  | { state: 'closed' }
  | { state: 'loading' }
  | { state: 'error'; message: string }
  | { state: 'ready'; detail: CandidateApplicationDetail };

export function ApplicationRow({
  application,
  initiallyOpen = false,
}: {
  application: CandidateApplicationItem;
  initiallyOpen?: boolean;
}) {
  const t = useTranslations('candidate.applications.row');
  const format = useFormatter();
  const [open, setOpen] = useState(initiallyOpen);
  const [details, setDetails] = useState<Details>({ state: initiallyOpen ? 'loading' : 'closed' });

  const applicationId = application.id;

  const fetchDetail = useCallback(async () => {
    try {
      setDetails({ state: 'ready', detail: await getMyApplication(applicationId) });
    } catch (cause) {
      setDetails({
        state: 'error',
        message: cause instanceof ApiError ? cause.message : t('loadError'),
      });
    }
  }, [applicationId, t]);

  // A row opened from `?application=` loads its history on mount.
  useEffect(() => {
    if (initiallyOpen) void fetchDetail();
  }, [initiallyOpen, fetchDetail]);

  // The history is fetched on first open; later toggles reuse it.
  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && details.state !== 'ready') {
      setDetails({ state: 'loading' });
      void fetchDetail();
    }
  }

  return (
    <Card className="space-y-4">
      <article aria-label={application.jobTitle} className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <Link
              href={`/jobs/${application.jobId}`}
              className="font-display text-lg font-semibold break-words text-foreground hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {application.jobTitle}
            </Link>
            <p className="text-sm text-muted-foreground">{application.companyName}</p>
          </div>
          <StatusBadge status={application.status} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span>{t('round', { name: application.currentStageName ?? '—' })}</span>
            <span>
              {t('updated', {
                date: format.dateTime(new Date(application.updatedAt), DATE_FORMAT),
              })}
            </span>
          </div>
          <Button variant="soft" aria-expanded={open} onClick={toggle}>
            {open ? t('hideDetails') : t('showDetails')}
          </Button>
        </div>

        {open && details.state === 'loading' && (
          <p className="text-sm text-muted-foreground">{t('loading')}</p>
        )}
        {open && details.state === 'error' && (
          <p role="alert" className="text-sm text-danger">
            {details.message}
          </p>
        )}
        {open && details.state === 'ready' && <ApplicationTimeline detail={details.detail} />}
      </article>
    </Card>
  );
}
