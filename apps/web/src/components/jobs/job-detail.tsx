import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { buildProcessView, type PublicJobDetail } from '@launchly/shared';
import { CompanyAvatar } from '@/components/jobs/company-avatar';
import { CompanyNotes } from '@/components/jobs/company-notes';
import { HiringProcessTimeline } from '@/components/jobs/hiring-process-timeline';
import { JobActions } from '@/components/jobs/job-actions';
import { Badge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { formatSalary, getInitials, levelConfig } from '@/lib/job-format';

function BulletCard({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <Card className="space-y-3">
      <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>
      <ul className="list-disc space-y-1.5 pl-5 text-sm text-foreground marker:text-primary">
        {items.map((item, index) => (
          <li key={`${index}-${item}`}>{item}</li>
        ))}
      </ul>
    </Card>
  );
}

type JobDetailProps = {
  job: PublicJobDetail;
  /** `page` is the job's own page (title is the h1); `panel` sits beside the jobs list. */
  variant?: 'page' | 'panel';
};

/** Everything a candidate needs about one job: facts, Apply, CV fit, hiring process and notes. */
export function JobDetail({ job, variant = 'page' }: JobDetailProps) {
  const t = useTranslations('jobs');
  const format = useFormatter();
  const level = levelConfig[job.level];
  const process = buildProcessView(job.stages, job.notes);
  const postedOn = format.dateTime(new Date(job.createdAt), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const Title = variant === 'page' ? 'h1' : 'h2';

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div className="flex items-start gap-4">
          <CompanyAvatar initials={getInitials(job.company.name)} size="lg" />
          <div className="min-w-0 flex-1 space-y-1">
            <Title
              className={cn(
                'font-display font-semibold break-words text-foreground',
                variant === 'page' ? 'text-2xl' : 'text-xl',
              )}
            >
              {job.title}
            </Title>
            <Link
              href={`/companies/${job.company.id}`}
              className="text-sm font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {job.company.name}
            </Link>
          </div>
          {variant === 'panel' && (
            <Link
              href={`/jobs/${job.id}`}
              className="shrink-0 text-xs font-medium text-subtle-foreground hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {t('detail.openJobPage')}
            </Link>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
          <Badge tone={level.tone} shape="pill">
            {t(`levels.${job.level}`)}
          </Badge>
          <span className="font-display font-semibold text-primary">
            {formatSalary(job.salary, t)}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="size-4" strokeWidth={1.75} aria-hidden />
            {job.location}
          </span>
          {job.industry && <span>{job.industry}</span>}
          <span className="text-subtle-foreground">{t('detail.posted', { date: postedOn })}</span>
        </div>

        <div className="flex flex-wrap gap-3" data-slot="job-actions">
          <JobActions jobId={job.id} jobTitle={job.title} />
          <Link href={`/cv-review?jobId=${job.id}`} className={buttonClasses('soft')}>
            {t('detail.checkCvFit')}
          </Link>
          <Link href={`/interview-practice?jobId=${job.id}`} className={buttonClasses('soft')}>
            {t('detail.practiceInterview')}
          </Link>
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-foreground">
          {t('detail.aboutRole')}
        </h2>
        <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">
          {job.description}
        </p>
      </Card>

      <BulletCard title={t('detail.requirements')} items={job.requirements} />
      <BulletCard title={t('detail.benefits')} items={job.benefits} />

      <HiringProcessTimeline view={process} />
      <CompanyNotes view={process} />
    </div>
  );
}
