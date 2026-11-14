import Link from 'next/link';
import { ArrowRight, BriefcaseBusiness } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { JobListCard } from '@/components/jobs/job-list-card';
import type { PublicJobItem } from '@launchly/shared';

type LatestJobsProps = { jobs: PublicJobItem[]; total: number };

/** The newest published jobs; an empty list (none yet, or the API is down) shows a short note. */
export function LatestJobs({ jobs, total }: LatestJobsProps) {
  const t = useTranslations('landing.latestJobs');
  return (
    <section aria-labelledby="latest-jobs-title" className="bg-background">
      <div className="mx-auto w-full max-w-page space-y-8 px-4 py-16 md:px-8 lg:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <h2
              id="latest-jobs-title"
              className="font-display text-3xl font-bold tracking-tight text-foreground"
            >
              {t('title')}
            </h2>
            <p className="text-muted-foreground">{t('subtitle')}</p>
          </div>
          {jobs.length > 0 && (
            <Link
              href="/jobs"
              className="group inline-flex items-center gap-1 rounded-control text-sm font-semibold text-primary hover:text-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {t('viewAll', { total })}
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                strokeWidth={2}
                aria-hidden
              />
            </Link>
          )}
        </div>

        {jobs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-card bg-surface px-6 py-12 text-center shadow-card">
            <BriefcaseBusiness className="size-8 text-subtle-foreground" strokeWidth={1.5} />
            <p className="font-display font-semibold text-foreground">{t('emptyTitle')}</p>
            <p className="text-sm text-muted-foreground">{t('emptyBody')}</p>
          </div>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {jobs.map((job) => (
              <li
                key={job.id}
                className="transition-transform *:h-full motion-safe:hover:-translate-y-0.5"
              >
                <JobListCard job={job} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
