import { ArrowRight, ChevronLeft, ChevronRight, Search, SearchX } from 'lucide-react';
import Form from 'next/form';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { getFormatter, getTranslations } from 'next-intl/server';
import type { PublicJobItem, PublicJobListResponse } from '@launchly/shared';
import { CompanyAvatar } from '@/components/jobs/company-avatar';
import { Badge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { searchJobs } from '@/lib/api/jobs';
import { cn } from '@/lib/cn';
import { getInitials, levelConfig } from '@/lib/job-format';

const PAGE_SIZE = 10;

const STEPS = [
  { title: 'Pick a job', body: 'Any published job, before or after you apply.' },
  { title: 'Choose the rounds', body: 'Practice the whole hiring process or a single round.' },
  { title: 'Answer and get feedback', body: 'Five written questions per round, then AI feedback.' },
];

/** The picker's address with the search and page kept; page 1 and an empty keyword are dropped. */
function pickerHref(keyword: string, page: number): string {
  const params = new URLSearchParams();
  if (keyword) params.set('keyword', keyword);
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `/interview-practice?${query}` : '/interview-practice';
}

async function loadJobs(keyword: string, page: number): Promise<PublicJobListResponse | null> {
  try {
    return await searchJobs(
      { keyword: keyword || undefined, page, limit: PAGE_SIZE },
      { cache: 'no-store' },
    );
  } catch (err) {
    console.warn('Jobs API call failed on the practice job picker:', err);
    return null;
  }
}

async function JobCard({ job }: { job: PublicJobItem }) {
  const t = await getTranslations('jobs');
  const format = await getFormatter();
  const posted = format.relativeTime(new Date(job.createdAt), new Date());

  return (
    <Link
      href={`/interview-practice?jobId=${job.id}`}
      className={cn(
        'group flex h-full flex-col gap-3 rounded-card bg-surface p-4 shadow-card transition-all',
        'hover:bg-surface-muted hover:shadow-card-hover',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
      )}
    >
      <div className="flex items-start gap-3">
        <CompanyAvatar initials={getInitials(job.company.name)} />
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-sm leading-snug font-semibold text-foreground transition-colors group-hover:text-primary">
            {job.title}
          </h3>
          <p className="truncate text-xs text-muted-foreground">{job.company.name}</p>
        </div>
        <Badge tone={levelConfig[job.level].tone} shape="pill">
          {t(`levels.${job.level}`)}
        </Badge>
      </div>
      <div className="mt-auto flex items-center justify-between gap-2 text-xs text-subtle-foreground">
        <span className="truncate">
          {job.location} · {posted}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-primary">
          Practice
          <ArrowRight
            aria-hidden
            className="size-3.5 transition-transform group-hover:translate-x-0.5"
          />
        </span>
      </div>
    </Link>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : undefined}
      className={cn(
        'inline-flex items-center gap-1 rounded-control px-3 py-1.5 text-sm font-medium transition-colors',
        disabled
          ? 'pointer-events-none text-subtle-foreground/40'
          : 'bg-surface-muted text-foreground hover:bg-surface-strong focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
      )}
    >
      {children}
    </Link>
  );
}

function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card bg-surface p-10 text-center shadow-card">
      <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-surface-muted text-subtle-foreground">
        <SearchX className="size-6" strokeWidth={1.5} aria-hidden />
      </div>
      <h3 className="font-display text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Published jobs to practice for: the search and how practice works on the left, a paged list on the right. */
export async function JobPicker({ keyword, page }: { keyword: string; page: number }) {
  const result = await loadJobs(keyword, page);

  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
      <aside className="space-y-4 lg:sticky lg:top-6 lg:col-span-4 xl:col-span-3">
        <Form
          action="/interview-practice"
          role="search"
          className="space-y-3 rounded-card bg-surface p-4 shadow-card"
        >
          <label
            htmlFor="practice-keyword"
            className="block font-display text-sm font-semibold text-foreground"
          >
            Find a job
          </label>
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle-foreground"
            />
            <input
              id="practice-keyword"
              type="search"
              name="keyword"
              aria-label="Search jobs"
              defaultValue={keyword}
              placeholder="Job title or keyword"
              className="w-full rounded-control bg-surface-muted py-2 pr-3 pl-9 text-sm text-foreground placeholder:text-subtle-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            />
          </div>
          <button type="submit" className={buttonClasses('primary', 'w-full')}>
            Search
          </button>
          {keyword && (
            <Link
              href="/interview-practice"
              className="block text-center text-xs font-medium text-subtle-foreground hover:text-primary"
            >
              Clear search
            </Link>
          )}
        </Form>

        <section
          aria-label="How practice works"
          className="space-y-3 rounded-card bg-surface p-4 shadow-card"
        >
          <h2 className="font-display text-sm font-semibold text-foreground">How it works</h2>
          <ol className="space-y-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span
                  aria-hidden
                  className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-xs font-semibold text-primary-subtle-foreground"
                >
                  {index + 1}
                </span>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground">{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </aside>

      <section aria-label="Choose a job" className="space-y-4 lg:col-span-8 xl:col-span-9">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-xl font-semibold text-foreground">
            {keyword ? `Jobs matching “${keyword}”` : 'Latest jobs'}
          </h2>
          {result && (
            <span className="text-sm text-muted-foreground">
              {result.pagination.total} {result.pagination.total === 1 ? 'job' : 'jobs'}
            </span>
          )}
        </div>

        {!result ? (
          <EmptyState
            title="Could not load jobs"
            body="The job list is unavailable right now. Try again in a moment."
            action={
              <Link href={pickerHref(keyword, page)} className={buttonClasses('soft')}>
                Try again
              </Link>
            }
          />
        ) : result.data.length === 0 ? (
          page > 1 && result.pagination.total > 0 ? (
            <EmptyState
              title="This page is empty"
              body="There are fewer jobs than this page needs."
              action={
                <Link href={pickerHref(keyword, 1)} className={buttonClasses('soft')}>
                  Back to the first page
                </Link>
              }
            />
          ) : (
            <EmptyState
              title="No published job matches your search"
              body="Try another job title or a shorter keyword."
              action={
                keyword ? (
                  <Link href="/interview-practice" className={buttonClasses('soft')}>
                    Clear search
                  </Link>
                ) : undefined
              }
            />
          )
        ) : (
          <>
            <ul className="grid gap-3 md:grid-cols-2">
              {result.data.map((job) => (
                <li key={job.id}>
                  <JobCard job={job} />
                </li>
              ))}
            </ul>

            {result.pagination.totalPages > 1 && (
              <nav
                aria-label="Job pages"
                className="flex items-center justify-between gap-3 border-t border-border pt-4"
              >
                <PageLink href={pickerHref(keyword, page - 1)} disabled={page <= 1}>
                  <ChevronLeft aria-hidden className="size-4" />
                  Previous
                </PageLink>
                <span className="text-sm text-muted-foreground">
                  Page {result.pagination.page} of {result.pagination.totalPages}
                </span>
                <PageLink
                  href={pickerHref(keyword, page + 1)}
                  disabled={page >= result.pagination.totalPages}
                >
                  Next
                  <ChevronRight aria-hidden className="size-4" />
                </PageLink>
              </nav>
            )}
          </>
        )}
      </section>
    </div>
  );
}
