import Link from 'next/link';
import { ChevronRight, ChevronLeft, SearchX } from 'lucide-react';
import { JobDetailPanel, type PanelJob } from '@/components/jobs/job-detail-panel';
import { JobFilters } from '@/components/jobs/job-filters';
import { JobListCard } from '@/components/jobs/job-list-card';
import { Badge } from '@/components/ui/badge';
import { getJob, searchJobs, type JobSearchFilters } from '@/lib/api/jobs';
import { cn } from '@/lib/cn';
import { JOB_LEVELS, type PublicJobListResponse, type JobLevel } from '@launchly/shared';

export const metadata = { title: 'Discover Jobs | Launchly' };

type SearchParams = Promise<{
  keyword?: string;
  industry?: string;
  level?: string;
  location?: string;
  page?: string;
  /** Job shown in the side panel on wide screens. */
  job?: string;
}>;

type JobsPageProps = {
  searchParams: SearchParams;
};

/** Loads one page of public jobs; an unreachable API renders as an empty list. */
async function loadJobs(filters: JobSearchFilters): Promise<PublicJobListResponse> {
  try {
    return await searchJobs(filters, { cache: 'no-store' });
  } catch (err) {
    console.warn('Jobs API call failed, returning empty result:', err);
    return { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  }
}

type ListParams = Record<string, string | undefined>;

/** `/jobs` with the list filters and page kept, plus the given overrides (an empty value drops a key). */
function jobsHref(baseParams: ListParams, overrides: ListParams): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...baseParams, ...overrides })) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `/jobs?${query}` : '/jobs';
}

/** A page change selects the first job of the new page, so the `job` key is dropped. */
function buildPageHref(baseParams: ListParams, page: number): string {
  return jobsHref(baseParams, { page: String(page) });
}

/** Details of the panel's job; a failure is shown in the panel while the list keeps working. */
async function loadPanelJob(jobId: string): Promise<PanelJob> {
  try {
    return { kind: 'ok', job: await getJob(jobId, { cache: 'no-store' }) };
  } catch (err) {
    console.warn(`Job ${jobId} could not be loaded for the side panel:`, err);
    return { kind: 'error', jobId };
  }
}

export default async function JobsPage({ searchParams }: JobsPageProps) {
  const resolvedParams = await searchParams;
  const { keyword, industry, level, location, page, job } = resolvedParams;

  const validLevel = (JOB_LEVELS as readonly string[]).includes(level ?? '')
    ? (level as JobLevel)
    : undefined;

  const filterParams = {
    keyword,
    industry,
    level: validLevel,
    location,
    page,
  };

  const response = await loadJobs({
    keyword: keyword?.trim() || undefined,
    industry: industry?.trim() || undefined,
    level: validLevel,
    location: location?.trim() || undefined,
    page: Number(page) > 0 ? Number(page) : undefined,
  });
  const { data: jobList, pagination } = response;

  const hasActiveFilters = Boolean(keyword || industry || level || location);

  // The requested job when it is on this page of results, otherwise the first one.
  const selectedId = jobList.find((item) => item.id === job)?.id ?? jobList[0]?.id;
  const panelJob = selectedId ? await loadPanelJob(selectedId) : null;

  return (
    <div className="mx-auto w-full max-w-page px-4 py-6 md:px-8">
      {/* Breadcrumb and Status */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
        >
          <Link href="/" className="transition-colors hover:text-primary">
            Home
          </Link>
          <ChevronRight className="size-4 text-subtle-foreground" strokeWidth={1.5} aria-hidden />
          <span aria-current="page" className="font-display font-semibold text-foreground">
            Explore Opportunities
          </span>
          <Badge tone="success" shape="pill" className="ml-1">
            {pagination.total} positions available
          </Badge>
        </nav>
      </div>

      <div
        className={cn(
          'w-full',
          panelJob ? 'lg:grid lg:grid-cols-12 lg:items-start lg:gap-6' : 'mx-auto max-w-3xl',
        )}
      >
        <div className="flex flex-col gap-4 lg:col-span-5">
          <JobFilters currentFilters={filterParams} />

          <div className="flex items-center justify-between px-1">
            <h2 className="font-display text-sm font-semibold text-foreground">Matching Jobs</h2>
            <span className="text-xs text-subtle-foreground">{pagination.total} results</span>
          </div>

          {jobList.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-card bg-surface p-8 text-center shadow-card">
              <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-surface-muted text-subtle-foreground">
                <SearchX className="size-6" strokeWidth={1.5} aria-hidden />
              </div>
              <h3 className="font-display text-sm font-semibold text-foreground">
                No matching jobs found
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                We could not find any jobs matching your current search criteria.
                {hasActiveFilters && ' Try broadening your keywords or removing some filters.'}
              </p>
              {hasActiveFilters && (
                <Link
                  href="/jobs"
                  className="mt-4 inline-flex items-center gap-1 rounded-control bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  Clear all filters
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {jobList.map((item) => (
                <JobListCard
                  key={item.id}
                  job={item}
                  panelHref={jobsHref(filterParams, { job: item.id })}
                  selected={item.id === selectedId}
                />
              ))}

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <nav
                  aria-label="Job list pagination"
                  className="mt-4 flex items-center justify-between border-t border-border pt-4"
                >
                  <Link
                    href={buildPageHref(filterParams, pagination.page - 1)}
                    aria-disabled={pagination.page <= 1}
                    tabIndex={pagination.page <= 1 ? -1 : undefined}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-control px-2.5 py-1 text-xs font-medium transition-colors',
                      pagination.page <= 1
                        ? 'pointer-events-none text-subtle-foreground/40'
                        : 'bg-surface-muted text-foreground hover:bg-surface-strong focus-visible:ring-2 focus-visible:ring-ring',
                    )}
                  >
                    <ChevronLeft className="size-3.5" aria-hidden />
                    Previous
                  </Link>

                  <span className="text-xs text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>

                  <Link
                    href={buildPageHref(filterParams, pagination.page + 1)}
                    aria-disabled={pagination.page >= pagination.totalPages}
                    tabIndex={pagination.page >= pagination.totalPages ? -1 : undefined}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-control px-2.5 py-1 text-xs font-medium transition-colors',
                      pagination.page >= pagination.totalPages
                        ? 'pointer-events-none text-subtle-foreground/40'
                        : 'bg-surface-muted text-foreground hover:bg-surface-strong focus-visible:ring-2 focus-visible:ring-ring',
                    )}
                  >
                    Next
                    <ChevronRight className="size-3.5" aria-hidden />
                  </Link>
                </nav>
              )}
            </div>
          )}
        </div>

        {panelJob && selectedId && (
          <JobDetailPanel
            key={selectedId}
            selected={panelJob}
            retryHref={jobsHref(filterParams, { job: selectedId })}
          />
        )}
      </div>
    </div>
  );
}
