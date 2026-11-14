'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { ExternalLink, ListOrdered, Pencil } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import type { RecruiterJob } from '@launchly/shared';
import { DeleteDraftButton } from '@/components/recruiter/delete-draft-button';
import { JobStatusBadge, useJobText } from '@/components/recruiter/job-status-badge';
import { RecruiterPageHeader } from '@/components/recruiter/recruiter-shell';
import { buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ApiError } from '@/lib/api/http';
import { getMyJob } from '@/lib/api/recruiter-jobs';
import { cn } from '@/lib/cn';

type LoadError = 'forbidden' | 'notFound' | 'generic';

const statusPanelTone: Record<RecruiterJob['status'], string> = {
  DRAFT: 'bg-surface-muted text-muted-foreground',
  PENDING: 'bg-warning-subtle text-warning',
  PUBLISHED: 'bg-success-subtle text-success',
  REJECTED: 'bg-danger-subtle text-danger',
  CLOSED: 'bg-surface-muted text-muted-foreground',
};

function StatusPanel({ job }: { job: RecruiterJob }) {
  const t = useTranslations('recruiter.detail');
  return (
    <div role="status" className={cn('rounded-card p-4 text-sm', statusPanelTone[job.status])}>
      <p className="font-medium">{t(`status.${job.status}`)}</p>
      {job.status === 'REJECTED' && job.moderationReason && (
        <p className="mt-1">{t('reason', { reason: job.moderationReason })}</p>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="space-y-3">
      <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>
      {children}
    </Card>
  );
}

function BulletList({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-subtle-foreground">{empty}</p>;
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

/** Read-only view of one of the recruiter's jobs, whatever its status. */
export function RecruiterJobDetail({ jobId }: { jobId: string }) {
  const t = useTranslations('recruiter.detail');
  const tPages = useTranslations('recruiter.pages');
  const tRounds = useTranslations('recruiter.rounds');
  const jobText = useJobText();
  const format = useFormatter();
  const router = useRouter();
  const [job, setJob] = useState<RecruiterJob | null>(null);
  const [error, setError] = useState<LoadError | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const result = await getMyJob(jobId);
        if (active) setJob(result);
      } catch (cause) {
        if (!active) return;
        setError(
          cause instanceof ApiError && cause.code === 'FORBIDDEN'
            ? 'forbidden'
            : cause instanceof ApiError && cause.code === 'NOT_FOUND'
              ? 'notFound'
              : 'generic',
        );
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [jobId]);

  const back = { href: '/recruiter/jobs', label: tPages('jobsBack') };
  const dateTime = (value: string) =>
    format.dateTime(new Date(value), { dateStyle: 'medium', timeStyle: 'short' });

  if (error) {
    return (
      <>
        <RecruiterPageHeader title={t('title')} back={back} />
        <p role="status" className="rounded-card bg-danger-subtle p-4 text-sm text-danger">
          {t(`errors.${error}`)}
        </p>
      </>
    );
  }
  if (!job) {
    return (
      <>
        <RecruiterPageHeader title={t('title')} back={back} />
        <div className="h-64 animate-pulse rounded-card bg-surface shadow-card" />
      </>
    );
  }

  return (
    <>
      <RecruiterPageHeader
        back={back}
        title={jobText.title(job.title)}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <JobStatusBadge status={job.status} />
            {jobText.meta(job)}
          </span>
        }
        actions={
          <>
            {job.status === 'DRAFT' && (
              <>
                <DeleteDraftButton
                  jobId={job.id}
                  title={jobText.title(job.title)}
                  label={t('actions.deleteDraft')}
                  onDeleted={() => router.push('/recruiter/jobs?deleted=1')}
                />
                <Link href={`/recruiter/jobs/${job.id}/edit`} className={buttonClasses('primary')}>
                  <Pencil className="size-4" aria-hidden /> {t('actions.edit')}
                </Link>
              </>
            )}
            {job.status === 'REJECTED' && (
              <Link href={`/recruiter/jobs/${job.id}/edit`} className={buttonClasses('primary')}>
                <Pencil className="size-4" aria-hidden /> {t('actions.fixAndResubmit')}
              </Link>
            )}
            {job.status === 'PUBLISHED' && (
              <>
                <Link href={`/recruiter/jobs/${job.id}/rounds`} className={buttonClasses('soft')}>
                  <ListOrdered className="size-4" aria-hidden /> {t('actions.editRounds')}
                </Link>
                <Link href={`/jobs?job=${job.id}`} className={buttonClasses('primary')}>
                  <ExternalLink className="size-4" aria-hidden /> {t('actions.viewPublic')}
                </Link>
              </>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section title={t('sections.description')}>
            {job.description ? (
              <p className="text-sm whitespace-pre-line text-foreground">{job.description}</p>
            ) : (
              <p className="text-sm text-muted-foreground">{t('sections.noDescription')}</p>
            )}
          </Section>
          <div className="grid gap-6 md:grid-cols-2">
            <Section title={t('sections.requirements')}>
              <BulletList items={job.requirements} empty={t('sections.noRequirements')} />
            </Section>
            <Section title={t('sections.benefits')}>
              <BulletList items={job.benefits} empty={t('sections.noBenefits')} />
            </Section>
          </div>
          <Section title={t('sections.rounds')}>
            {job.rounds.length === 0 ? (
              <p className="text-sm text-subtle-foreground">{t('sections.noRounds')}</p>
            ) : (
              <ol className="space-y-3">
                {job.rounds.map((round) => (
                  <li key={round.id} className="flex gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-subtle font-mono text-sm text-primary-subtle-foreground">
                      {round.position}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {round.name || t('sections.untitledRound')}
                      </p>
                      <p className="text-xs text-subtle-foreground">
                        {[
                          round.format
                            ? tRounds(`formats.${round.format}`)
                            : t('sections.noFormat'),
                          round.estimatedDurationMinutes !== null
                            ? t('sections.minutes', { count: round.estimatedDurationMinutes })
                            : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Section>
          <Section title={t('sections.notes')}>
            <BulletList items={job.notes.map((n) => n.content)} empty={t('sections.noNotes')} />
          </Section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
          <StatusPanel job={job} />
          <Card className="space-y-3 text-sm">
            <h2 className="font-display text-lg font-semibold text-foreground">
              {t('info.title')}
            </h2>
            <dl className="space-y-2">
              {[
                [t('info.level'), job.level ? jobText.level(job.level) : t('info.notSet')],
                [t('info.location'), job.location || t('info.notSet')],
                [t('info.industry'), job.industry ?? t('info.notSet')],
                [t('info.salary'), jobText.salary(job.salary)],
                [t('info.createdAt'), dateTime(job.createdAt)],
                [t('info.updatedAt'), dateTime(job.updatedAt)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-subtle-foreground">{label}</dt>
                  <dd className="text-right font-medium text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </aside>
      </div>
    </>
  );
}
