import Link from 'next/link';
import { CompanyAvatar } from '@/components/jobs/company-avatar';
import { MatchScoreBadge } from '@/components/jobs/match-score-badge';
import type { Job } from '@/components/jobs/mock-jobs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';

type JobListCardProps = { job: Job; selected: boolean };

export function JobListCard({ job, selected }: JobListCardProps) {
  return (
    <Link
      href={`/jobs?job=${job.id}`}
      scroll={false}
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'group block rounded-card bg-surface p-4 transition-all',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        selected
          ? 'shadow-card-hover ring-2 ring-primary'
          : 'shadow-card hover:bg-surface-muted hover:shadow-card-hover',
      )}
    >
      <div className="mb-1 flex items-start justify-between gap-1">
        <div className="flex items-center gap-2">
          <CompanyAvatar initials={job.companyInitials} />
          <div>
            <h3 className="font-display text-sm leading-snug font-semibold transition-colors group-hover:text-primary">
              {job.shortTitle}
            </h3>
            <p className="text-xs text-muted-foreground">{job.company}</p>
          </div>
        </div>
        <MatchScoreBadge score={job.matchScore} />
      </div>

      <div className="my-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
        <span className="font-display text-sm font-semibold text-primary">{job.salaryRange}</span>
        <span aria-hidden className="text-subtle-foreground">
          ·
        </span>
        <span>{job.district}</span>
      </div>

      <div className="flex flex-wrap items-center gap-1 pt-1">
        {job.tags.map((tag) => (
          <Badge key={tag.label} tone={tag.tone}>
            {tag.label}
          </Badge>
        ))}
      </div>
    </Link>
  );
}
