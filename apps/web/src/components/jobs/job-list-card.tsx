import Link from 'next/link';
import { CompanyAvatar } from '@/components/jobs/company-avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import { formatSalary, getInitials, levelConfig } from '@/lib/job-format';
import type { PublicJobItem } from '@launchly/shared';

type JobListCardProps = { job: PublicJobItem };

export function JobListCard({ job }: JobListCardProps) {
  const initials = getInitials(job.company.name);
  const salaryText = formatSalary(job.salary);
  const levelInfo = levelConfig[job.level];

  return (
    <Link
      href={`/jobs/${job.id}`}
      className={cn(
        'group block rounded-card bg-surface p-4 shadow-card transition-all',
        'hover:bg-surface-muted hover:shadow-card-hover',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
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
