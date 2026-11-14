'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { buildProcessView, type AdminJob } from '@launchly/shared';
import { MODERATION_DATE_FORMAT } from '@/components/admin/pending-company-list';
import { RejectDialog } from '@/components/admin/reject-dialog';
import { CompanyNotes } from '@/components/jobs/company-notes';
import { HiringProcessTimeline } from '@/components/jobs/hiring-process-timeline';
import { JobStatusBadge, useJobText } from '@/components/recruiter/job-status-badge';
import { Button, buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { approveJob, getAdminJob, rejectJob } from '@/lib/api/admin-jobs';
import { ApiError } from '@/lib/api/http';
import { authErrorMessage, type ErrorTranslator } from '@/lib/auth-helpers';

type AdminTranslator = ReturnType<typeof useTranslations<'admin'>>;

/** Readable text for a failed admin call; an invalid id only matters when loading. */
function moderationErrorText(
  error: unknown,
  t: AdminTranslator,
  tErrors: ErrorTranslator,
  loading = false,
): string {
  if (error instanceof ApiError) {
    if (error.code === 'NOT_FOUND' || (loading && error.code === 'VALIDATION_ERROR')) {
      return t('jobReview.notFound');
    }
    if (error.code === 'FORBIDDEN') return t('moderation.forbidden');
  }
  return authErrorMessage(error, tErrors);
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-subtle-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm whitespace-pre-line text-foreground">{children || '—'}</dd>
    </div>
  );
}

function List({ items }: { items: string[] }) {
  if (items.length === 0) return <>—</>;
  return (
    <ul className="list-disc space-y-0.5 pl-5">
      {items.map((item, index) => (
        // Recruiters may repeat an item, so the position is part of the key.
        <li key={`${index}-${item}`}>{item}</li>
      ))}
    </ul>
  );
}

/** Everything a recruiter submitted for a job, as candidates will see it, with approve and reject. */
export function JobReview({ id }: { id: string }) {
  const t = useTranslations('admin');
  const tErrors = useTranslations('errors');
  const format = useFormatter();
  const jobText = useJobText();
  const [job, setJob] = useState<AdminJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** The decision buttons are hidden once the job is known to be decided, even if a reload failed. */
  const [decided, setDecided] = useState(false);

  useEffect(() => {
    let active = true;
    setJob(null);
    setError(null);
    setNotice(null);
    setDecided(false);
    async function load() {
      try {
        const loaded = await getAdminJob(id);
        if (active) setJob(loaded);
      } catch (cause) {
        if (active) setError(moderationErrorText(cause, t, tErrors, true));
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [id]);

  /** Another admin decided first (E1): show what they decided. */
  async function showDecided() {
    setNotice(t('moderation.decided'));
    setDecided(true);
    try {
      setJob(await getAdminJob(id));
    } catch (cause) {
      setError(moderationErrorText(cause, t, tErrors));
    }
  }

  async function approve() {
    setBusy(true);
    setError(null);
    try {
      setJob(await approveJob(id));
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === 'CONFLICT') await showDecided();
      else setError(moderationErrorText(cause, t, tErrors));
    } finally {
      setBusy(false);
    }
  }

  /** Throws a readable Error on failure so the dialog stays open with the reason. */
  async function reject(reason: string) {
    setBusy(true);
    setError(null);
    try {
      setJob(await rejectJob(id, reason));
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === 'CONFLICT') await showDecided();
      else throw new Error(moderationErrorText(cause, t, tErrors), { cause });
    } finally {
      setBusy(false);
    }
  }

  const back = (
    <Link href="/admin/moderation/jobs" className={buttonClasses('ghost', 'w-fit')}>
      <ArrowLeft className="size-4" aria-hidden />
      {t('moderation.back')}
    </Link>
  );

  if (!job) {
    return (
      <>
        {back}
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : (
          <div className="h-48 animate-pulse rounded-card bg-surface-muted" />
        )}
      </>
    );
  }

  const timeline = buildProcessView(
    job.rounds.map((round) => ({ ...round, description: null })),
    job.notes,
  );
  // The candidate view hides notes when a job has no rounds; the admin must still see them.
  const notesView = {
    ...timeline,
    showNotes: job.notes.length > 0,
    notes: [...job.notes].sort((a, b) => a.position - b.position),
  };
  const pending = job.status === 'PENDING' && !decided;

  return (
    <>
      {back}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold text-foreground">
          {jobText.title(job.title)}
        </h1>
        <JobStatusBadge status={job.status} />
      </div>
      <p className="text-sm text-muted-foreground">
        {job.companyName} · {jobText.meta(job)}
      </p>
      {notice && (
        <p role="status" className="rounded-control bg-warning-subtle p-3 text-sm text-warning">
          {notice}
        </p>
      )}
      {job.moderationReason && (job.status === 'REJECTED' || job.status === 'PENDING') && (
        <p className="rounded-control bg-danger-subtle p-3 text-sm text-danger">
          {job.status === 'PENDING' && (
            <span className="block font-semibold">{t('jobReview.rejectedBefore')}</span>
          )}
          {t('moderation.reason', { reason: job.moderationReason })}
        </p>
      )}
      <Card>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Field label={t('moderation.fields.salary')}>{jobText.salary(job.salary)}</Field>
          <Field label={t('moderation.fields.industry')}>{job.industry}</Field>
          <Field label={t('moderation.fields.recruiterEmail')}>{job.creatorEmail}</Field>
          {job.status === 'PENDING' ? (
            <Field label={t('moderation.fields.submittedAt')}>
              {format.dateTime(new Date(job.updatedAt), MODERATION_DATE_FORMAT)}
            </Field>
          ) : (
            <Field label={t('moderation.fields.reviewedAt')}>
              {job.reviewedAt
                ? format.dateTime(new Date(job.reviewedAt), MODERATION_DATE_FORMAT)
                : null}
            </Field>
          )}
          <div className="sm:col-span-2">
            <Field label={t('moderation.fields.description')}>{job.description}</Field>
          </div>
          <Field label={t('moderation.fields.requirements')}>
            <List items={job.requirements} />
          </Field>
          <Field label={t('moderation.fields.benefits')}>
            <List items={job.benefits} />
          </Field>
        </dl>
      </Card>
      <HiringProcessTimeline view={timeline} />
      <CompanyNotes view={notesView} />
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {pending && (
        <div className="flex justify-end gap-2">
          <RejectDialog heading={t('jobReview.rejectHeading')} disabled={busy} onSubmit={reject} />
          <Button disabled={busy} onClick={() => void approve()}>
            <CheckCircle2 className="size-4" aria-hidden />
            {t('moderation.approve')}
          </Button>
        </div>
      )}
    </>
  );
}
