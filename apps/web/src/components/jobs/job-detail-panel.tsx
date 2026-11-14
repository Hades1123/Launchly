import Link from 'next/link';
import { CircleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { PublicJobDetail } from '@launchly/shared';
import { JobDetail } from '@/components/jobs/job-detail';
import { RevealPanelTop } from '@/components/jobs/reveal-panel-top';
import { buttonClasses } from '@/components/ui/button';

export type PanelJob = { kind: 'ok'; job: PublicJobDetail } | { kind: 'error'; jobId: string };

/** Right-hand panel of the jobs page (wide screens only): the selected job, or why it failed. */
export function JobDetailPanel({ selected, retryHref }: { selected: PanelJob; retryHref: string }) {
  const t = useTranslations('jobs.panel');
  return (
    <aside
      data-job-panel
      aria-label={t('label')}
      className="hidden lg:panel-below-header lg:col-span-7 lg:block"
    >
      <RevealPanelTop />
      {selected.kind === 'ok' ? (
        <JobDetail job={selected.job} variant="panel" />
      ) : (
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-card bg-surface p-8 text-center shadow-card"
        >
          <CircleAlert className="size-8 text-danger" strokeWidth={1.5} aria-hidden />
          <h2 className="font-display text-base font-semibold text-foreground">
            {t('errorTitle')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('errorBody')}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href={retryHref} className={buttonClasses('primary')}>
              {t('retry')}
            </Link>
            <Link href={`/jobs/${selected.jobId}`} className={buttonClasses('soft')}>
              {t('openJobPage')}
            </Link>
          </div>
        </div>
      )}
    </aside>
  );
}
