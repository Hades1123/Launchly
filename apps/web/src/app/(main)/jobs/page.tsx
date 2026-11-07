import Link from 'next/link';
import { ChevronRight, ChevronLeft, SearchX } from 'lucide-react';
import { JobDetail } from '@/components/jobs/job-detail';
import { JobFilters } from '@/components/jobs/job-filters';
import { JobListCard } from '@/components/jobs/job-list-card';
import { findJob, type Job } from '@/components/jobs/mock-jobs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import type { PublicJobItem, PublicJobListResponse, JobLevel } from '@launchly/shared';

export const metadata = { title: 'Discover Jobs | Launchly' };

type SearchParams = Promise<{
  keyword?: string;
  industry?: string;
  level?: string;
  location?: string;
  page?: string;
  job?: string;
}>;

type JobsPageProps = {
  searchParams: SearchParams;
};

async function fetchJobs(
  params: Record<string, string | undefined>,
): Promise<PublicJobListResponse> {
  const apiUrl = process.env.API_URL ?? 'http://localhost:4000';
  const query = new URLSearchParams();

  if (params.keyword?.trim()) query.set('keyword', params.keyword.trim());
  if (params.industry?.trim()) query.set('industry', params.industry.trim());
  if (params.level?.trim()) query.set('level', params.level.trim());
  if (params.location?.trim()) query.set('location', params.location.trim());
  if (params.page?.trim()) query.set('page', params.page.trim());

  try {
    const res = await fetch(`${apiUrl}/jobs?${query.toString()}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error(`API returned ${res.status}`);
    }
    return (await res.json()) as PublicJobListResponse;
  } catch (err) {
    console.warn('Jobs API call failed, returning empty result:', err);
    return {
      data: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
    };
  }
}

function buildPageHref(baseParams: Record<string, string | undefined>, page: number): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(baseParams)) {
    if (value && key !== 'page') {
      params.set(key, value);
    }
  }
  params.set('page', String(page));
  return `/jobs?${params.toString()}`;
}

function adaptToDetailJob(item: PublicJobItem): Job {
  const fallback = findJob(item.id);
  const salaryText =
    !item.salary.negotiable && item.salary.min !== null && item.salary.max !== null
      ? `${item.salary.min.toLocaleString()} - ${item.salary.max.toLocaleString()} USD`
      : 'Negotiable';

  return {
    ...fallback,
    id: item.id,
    title: item.title,
    shortTitle: item.title,
    company: item.company.name,
    companyInitials: item.company.name.slice(0, 2).toUpperCase(),
    level: item.level === 'INTERN' ? 'Intern' : item.level === 'FRESHER' ? 'Fresher' : 'Junior',
    district: item.location,
    address: item.location,
    salaryRange: salaryText,
    salaryShort: salaryText,
    requirements: item.requirements.length > 0 ? item.requirements : fallback.requirements,
    benefits:
      item.benefits.length > 0
        ? item.benefits.map((b) => ({ title: b, body: '' }))
        : fallback.benefits,
  };
}

export default async function JobsPage({ searchParams }: JobsPageProps) {
  const resolvedParams = await searchParams;
  const { keyword, industry, level, location, page, job } = resolvedParams;

  const validLevel = (
    level === 'INTERN' || level === 'FRESHER' || level === 'SENIOR' ? level : undefined
  ) as JobLevel | undefined;

  const filterParams = {
    keyword,
    industry,
    level: validLevel,
    location,
    page,
  };

  const response = await fetchJobs(filterParams);
  const { data: jobList, pagination } = response;

  // Determine active selected job for detail preview
  const selectedPublicJob = jobList.find((j) => j.id === job) ?? jobList[0] ?? null;
  const detailJob = selectedPublicJob ? adaptToDetailJob(selectedPublicJob) : findJob(undefined);

  const queryParams = new URLSearchParams();
  if (keyword) queryParams.set('keyword', keyword);
  if (industry) queryParams.set('industry', industry);
  if (validLevel) queryParams.set('level', validLevel);
  if (location) queryParams.set('location', location);
  if (page) queryParams.set('page', page);
  const queryString = queryParams.toString();

  const hasActiveFilters = Boolean(keyword || industry || level || location);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8">
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

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Left column: Search, Filters, Job List */}
        <aside className="flex flex-col gap-4 lg:col-span-5">
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
                  selected={selectedPublicJob?.id === item.id}
                  queryString={queryString}
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
        </aside>

        {/* Right column: Job Detail Preview (SCRUM-29) */}
        <section aria-label="Job details preview" className="lg:col-span-7">
          {selectedPublicJob ? (
            <JobDetail job={detailJob} />
          ) : (
            <div className="flex h-64 items-center justify-center rounded-card bg-surface p-8 text-center shadow-card">
              <p className="text-xs text-muted-foreground">
                Select a job from the list to preview details.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
