'use client';

import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import type { PublicJobDetail } from '@launchly/shared';
import { getJob } from '@/lib/api/jobs';

type JobText = Pick<PublicJobDetail, 'id' | 'description' | 'requirements'>;

/** The job text the practice questions are written from, so the candidate can check them. */
export function JobDescription({ job }: { job: JobText }) {
  const t = useTranslations('candidate.interviewPractice.jobTab');
  return (
    <div className="space-y-5 text-sm">
      <p className="rounded-control bg-info-subtle px-3 py-2 text-xs text-info">{t('basis')}</p>
      <section className="space-y-2">
        <h3 className="font-display text-base font-semibold text-foreground">{t('about')}</h3>
        <p className="leading-relaxed whitespace-pre-line text-foreground">{job.description}</p>
      </section>
      {job.requirements.length > 0 && (
        <section className="space-y-2">
          <h3 className="font-display text-base font-semibold text-foreground">
            {t('requirements')}
          </h3>
          <ul className="list-disc space-y-1.5 pl-5 text-foreground marker:text-primary">
            {job.requirements.map((item, index) => (
              <li key={`${index}-${item}`}>{item}</li>
            ))}
          </ul>
        </section>
      )}
      <Link
        href={`/jobs/${job.id}`}
        target="_blank"
        rel="noopener"
        className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
      >
        {t('openJob')}
        <ExternalLink aria-hidden className="size-3.5" />
      </Link>
    </div>
  );
}

/** Loads the job for a practice session; the job may have been unpublished since. */
export function JobDescriptionLoader({ jobId }: { jobId: string }) {
  const t = useTranslations('candidate.interviewPractice');
  const [job, setJob] = useState<PublicJobDetail | 'failed' | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const loaded = await getJob(jobId);
        if (active) setJob(loaded);
      } catch {
        if (active) setJob('failed');
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [jobId]);

  if (job === null) return <p className="text-sm text-muted-foreground">{t('loading')}</p>;
  if (job === 'failed') {
    return (
      <p role="alert" className="text-sm text-muted-foreground">
        {t('jobTab.loadError')}
      </p>
    );
  }
  return <JobDescription job={job} />;
}
