'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition, type MouseEvent } from 'react';
import { CompanyAvatar } from '@/components/jobs/company-avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import { formatSalary, getInitials, levelConfig } from '@/lib/job-format';
import type { PublicJobItem } from '@launchly/shared';

/** Matches the `lg` breakpoint, where the jobs page shows the detail panel beside the list. */
const PANEL_QUERY = '(min-width: 64rem)';

/**
 * Near the end of a long list the sticky panel is pushed up with the list and its top hides under
 * the fixed header; scroll back to the top so the newly selected job is read from its title.
 */
function revealPanelTop() {
  const panel = document.querySelector('[data-job-panel]');
  const headerBottom = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
  if (!panel || panel.getBoundingClientRect().top >= headerBottom) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
}

type JobListCardProps = {
  job: PublicJobItem;
  /** The jobs-page address that selects this job in the side panel; without it the card only links to the job page. */
  panelHref?: string;
  selected?: boolean;
};

/**
 * Job summary card. Its link is always the job's own page (new tab, phones, no JavaScript); on wide
 * screens with a `panelHref` a plain click selects the job in the side panel instead.
 */
export function JobListCard({ job, panelHref, selected = false }: JobListCardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const initials = getInitials(job.company.name);
  const salaryText = formatSalary(job.salary);
  const levelInfo = levelConfig[job.level];

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!panelHref || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!window.matchMedia(PANEL_QUERY).matches) return;
    event.preventDefault();
    revealPanelTop();
    startTransition(() => router.push(panelHref, { scroll: false }));
  }

  return (
    <Link
      href={`/jobs/${job.id}`}
      onClick={handleClick}
      aria-current={selected ? 'true' : undefined}
      aria-busy={pending || undefined}
      className={cn(
        'group block rounded-card bg-surface p-4 shadow-card transition-all',
        'hover:bg-surface-muted hover:shadow-card-hover',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        selected &&
          'lg:bg-primary-subtle/40 lg:ring-2 lg:ring-primary lg:hover:bg-primary-subtle/40',
        pending && 'opacity-70',
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <CompanyAvatar initials={initials} />
          <div>
            <h3 className="font-display text-sm leading-snug font-semibold text-foreground transition-colors group-hover:text-primary">
              {job.title}
            </h3>
            <p className="text-xs text-muted-foreground">{job.company.name}</p>
          </div>
        </div>
        <Badge tone={levelInfo.tone} shape="pill">
          {levelInfo.label}
        </Badge>
      </div>

      <div className="my-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
        <span className="font-display text-xs font-semibold text-primary">{salaryText}</span>
        <span aria-hidden className="text-subtle-foreground">
          ·
        </span>
        <span>{job.location}</span>
        {job.industry && (
          <>
            <span aria-hidden className="text-subtle-foreground">
              ·
            </span>
            <span className="text-subtle-foreground">{job.industry}</span>
          </>
        )}
      </div>

      {job.requirements.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 pt-1">
          {job.requirements.slice(0, 3).map((req) => (
            <Badge key={req} tone="neutral" shape="tag">
              {req}
            </Badge>
          ))}
        </div>
      )}
    </Link>
  );
}
