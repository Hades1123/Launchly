import Link from 'next/link';
import { CompanyAvatar } from '@/components/jobs/company-avatar';
import { Badge } from '@/components/ui/badge';
import type { BadgeTone } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import type { PublicJobItem } from '@launchly/shared';

type JobListCardProps = {
  job: PublicJobItem;
  selected?: boolean;
  queryString?: string;
};

const levelConfig: Record<PublicJobItem['level'], { label: string; tone: BadgeTone }> = {
  INTERN: { label: 'Intern', tone: 'neutral' },
  FRESHER: { label: 'Fresher', tone: 'success' },
  SENIOR: { label: 'Senior', tone: 'primary' },
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'CO';
  const first = parts[0]?.[0] ?? 'C';
  const last = parts[parts.length - 1]?.[0] ?? first;
  return (first + last).toUpperCase();
}

function formatSalary({ negotiable, min, max }: PublicJobItem['salary']): string {
  if (negotiable) return 'Negotiable';
  if (min !== null && max !== null) return `$${min} - $${max}`;
  if (min !== null) return `From $${min}`;
  if (max !== null) return `Up to $${max}`;
  return 'Negotiable';
}

export function JobListCard({ job, selected, queryString }: JobListCardProps) {
  const initials = getInitials(job.company.name);
  const salaryText = formatSalary(job.salary);
  const levelInfo = levelConfig[job.level];
  const href = `/jobs?job=${job.id}${queryString ? `&${queryString}` : ''}`;

  return (
    <Link
      href={href}
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
