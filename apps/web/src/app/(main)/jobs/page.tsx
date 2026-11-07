import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { JobDetail } from '@/components/jobs/job-detail';
import { JobFilters } from '@/components/jobs/job-filters';
import { JobListCard } from '@/components/jobs/job-list-card';
import { findJob, jobs } from '@/components/jobs/mock-jobs';
import { Badge } from '@/components/ui/badge';

export const metadata = { title: 'Khám phá việc làm | Launchly' };

type JobsPageProps = {
  searchParams: Promise<{ job?: string | string[] }>;
};

export default async function JobsPage({ searchParams }: JobsPageProps) {
  const { job } = await searchParams;
  const selected = findJob(Array.isArray(job) ? job[0] : job);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
        >
          <Link href="/" className="transition-colors hover:text-primary">
            Trang chủ
          </Link>
          <ChevronRight className="size-4 text-subtle-foreground" strokeWidth={1.5} aria-hidden />
          <span aria-current="page" className="font-display font-semibold text-foreground">
            Khám phá việc làm Fresher & Junior
          </span>
          <Badge tone="success" shape="pill" className="ml-1">
            {jobs.length} vị trí minh bạch
          </Badge>
        </nav>
        <Badge tone="warning" shape="pill">
          Dữ liệu minh họa, chưa kết nối API
        </Badge>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <aside className="flex flex-col gap-4 lg:col-span-4">
          <JobFilters />
          <div className="flex items-center justify-between px-1">
            <h2 className="font-display text-sm font-semibold">Danh sách phù hợp</h2>
            <span className="text-xs text-subtle-foreground">{jobs.length} kết quả</span>
          </div>
          <div className="space-y-2">
            {jobs.map((item) => (
              <JobListCard key={item.id} job={item} selected={item.id === selected.id} />
            ))}
          </div>
        </aside>

        <section aria-label="Chi tiết tin tuyển dụng" className="lg:col-span-8">
          <JobDetail job={selected} />
        </section>
      </div>
    </div>
  );
}
