import { cache } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, MapPin } from 'lucide-react';
import { buildProcessView } from '@launchly/shared';
import { CompanyAvatar } from '@/components/jobs/company-avatar';
import { CompanyNotes } from '@/components/jobs/company-notes';
import { HiringProcessTimeline } from '@/components/jobs/hiring-process-timeline';
import { JobActions } from '@/components/jobs/job-actions';
import { Badge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ApiError } from '@/lib/api/http';
import { getJob } from '@/lib/api/jobs';
import { formatSalary, getInitials, levelConfig } from '@/lib/job-format';

type JobDetailPageProps = { params: Promise<{ id: string }> };

/** One API call per request, shared by `generateMetadata` and the page. */
const fetchJob = cache((id: string) => getJob(id, { cache: 'no-store' }));

/** An unknown, malformed or non-public id is a 404; any other failure reaches the error boundary. */
async function loadJob(id: string) {
  try {
    return await fetchJob(id);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) notFound();
    throw err;
  }
}

export async function generateMetadata({ params }: JobDetailPageProps) {
  const { id } = await params;
  try {
    const job = await fetchJob(id);
    return { title: `${job.title} · ${job.company.name} | Launchly` };
  } catch {
    return { title: 'Job | Launchly' };
  }
}

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

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const { id } = await params;
  const job = await loadJob(id);
  const level = levelConfig[job.level];
  const process = buildProcessView(job.stages, job.notes);
  const postedOn = new Date(job.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 md:px-8">
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
      >
        <Link href="/jobs" className="transition-colors hover:text-primary">
          All jobs
        </Link>
        <ChevronRight className="size-4 text-subtle-foreground" strokeWidth={1.5} aria-hidden />
        <span aria-current="page" className="font-semibold text-foreground">
          {job.title}
        </span>
      </nav>

      <Card className="space-y-4">
        <div className="flex items-start gap-4">
          <CompanyAvatar initials={getInitials(job.company.name)} size="lg" />
          <div className="min-w-0 space-y-1">
            <h1 className="font-display text-2xl font-semibold break-words text-foreground">
              {job.title}
            </h1>
            <Link
              href={`/companies/${job.company.id}`}
              className="text-sm font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {job.company.name}
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
          <Badge tone={level.tone} shape="pill">
            {level.label}
          </Badge>
          <span className="font-display font-semibold text-primary">
            {formatSalary(job.salary)}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="size-4" strokeWidth={1.75} aria-hidden />
            {job.location}
          </span>
          {job.industry && <span>{job.industry}</span>}
          <span className="text-subtle-foreground">Posted {postedOn}</span>
        </div>

        <div className="flex flex-wrap gap-3" data-slot="job-actions">
          <JobActions jobId={job.id} jobTitle={job.title} />
          <Link href={`/cv-review?jobId=${job.id}`} className={buttonClasses('soft')}>
            Check my CV fit
          </Link>
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-foreground">About the role</h2>
        <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">
          {job.description}
        </p>
      </Card>

      <BulletCard title="Requirements" items={job.requirements} />
      <BulletCard title="Benefits" items={job.benefits} />

      <HiringProcessTimeline view={process} />
      <CompanyNotes view={process} />
    </div>
  );
}
