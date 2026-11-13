import Link from 'next/link';
import { CircleAlert } from 'lucide-react';
import type { PublicJobDetail } from '@launchly/shared';
import { JobDetail } from '@/components/jobs/job-detail';
import { buttonClasses } from '@/components/ui/button';

export type PanelJob = { kind: 'ok'; job: PublicJobDetail } | { kind: 'error'; jobId: string };

/** Right-hand panel of the jobs page (wide screens only): the selected job, or why it failed. */
export function JobDetailPanel({ selected, retryHref }: { selected: PanelJob; retryHref: string }) {
  return (
    <aside aria-label="Job details" className="hidden lg:panel-below-header lg:col-span-7 lg:block">
      {selected.kind === 'ok' ? (
        <JobDetail job={selected.job} variant="panel" />
      ) : (
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-card bg-surface p-8 text-center shadow-card"
        >
          <CircleAlert className="size-8 text-danger" strokeWidth={1.5} aria-hidden />
          <h2 className="font-display text-base font-semibold text-foreground">
            Could not load this job
          </h2>
          <p className="text-sm text-muted-foreground">
            The job list still works. Try again, or open the job on its own page.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href={retryHref} className={buttonClasses('primary')}>
              Try again
            </Link>
            <Link href={`/jobs/${selected.jobId}`} className={buttonClasses('soft')}>
              Open job page
            </Link>
          </div>
        </div>
      )}
    </aside>
  );
}
