import { cache } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { JobDetail } from '@/components/jobs/job-detail';
import { ApiError } from '@/lib/api/http';
import { getJob } from '@/lib/api/jobs';
import { getTranslations } from 'next-intl/server';

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
  const t = await getTranslations('jobs.metadata');
  try {
    const job = await fetchJob(id);
    return { title: t('detailTitle', { title: job.title, company: job.company.name }) };
  } catch {
    return { title: t('detailFallback') };
  }
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const { id } = await params;
  const job = await loadJob(id);
  const t = await getTranslations('jobs');
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 md:px-8">
      <nav
        aria-label={t('breadcrumb')}
        className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
      >
        <Link href="/jobs" className="transition-colors hover:text-primary">
          {t('detailPage.allJobs')}
        </Link>
        <ChevronRight className="size-4 text-subtle-foreground" strokeWidth={1.5} aria-hidden />
        <span aria-current="page" className="font-semibold text-foreground">
          {job.title}
        </span>
      </nav>

      <JobDetail job={job} />
    </div>
  );
}
