'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness, CheckCircle2, Plus, Search } from 'lucide-react';
import {
  JOB_LEVELS,
  JOB_PUBLICATION_STATUSES,
  isJobEditable,
  type JobLevel,
  type JobPublicationStatus,
  type RecruiterJobListItem,
} from '@launchly/shared';
import { RecruiterPageHeader } from '@/components/recruiter/recruiter-shell';
import {
  JOB_LEVEL_LABELS,
  JobStatusBadge,
  jobStatusLabel,
} from '@/components/recruiter/job-status-badge';
import { buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { listMyJobs } from '@/lib/api/recruiter-jobs';
import { cn } from '@/lib/cn';

export type StatusFilter = JobPublicationStatus | 'ALL';

const TABS: StatusFilter[] = ['ALL', ...JOB_PUBLICATION_STATUSES];

const dateFormat = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });

const tabLabel = (tab: StatusFilter) => (tab === 'ALL' ? 'Tất cả' : jobStatusLabel(tab));

/** The recruiter's jobs with status tabs, a title search and a level filter. */
export function RecruiterJobList({
  initialStatus,
  submittedId,
}: {
  initialStatus: StatusFilter;
  submittedId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [jobs, setJobs] = useState<RecruiterJobListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusFilter>(initialStatus);
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<JobLevel | ''>('');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const result = await listMyJobs();
        if (active) setJobs(result.jobs);
      } catch {
        if (active) setError('Không thể tải danh sách tin tuyển dụng. Vui lòng thử lại.');
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  function selectStatus(next: StatusFilter) {
    setStatus(next);
    router.replace(next === 'ALL' ? pathname : `${pathname}?status=${next}`, { scroll: false });
  }

  const counts = useMemo(() => {
    const result: Record<StatusFilter, number> = {
      ALL: 0,
      DRAFT: 0,
      PENDING: 0,
      PUBLISHED: 0,
      REJECTED: 0,
      CLOSED: 0,
    };
    for (const job of jobs ?? []) {
      result.ALL += 1;
      result[job.status] += 1;
    }
    return result;
  }, [jobs]);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('vi');
    return (jobs ?? []).filter(
      (job) =>
        (status === 'ALL' || job.status === status) &&
        (!level || job.level === level) &&
        (!needle || job.title.toLocaleLowerCase('vi').includes(needle)),
    );
  }, [jobs, status, level, query]);

  const submitted = jobs?.find((job) => job.id === submittedId);
  const filtering = status !== 'ALL' || level !== '' || query.trim() !== '';

  return (
    <>
      <RecruiterPageHeader
        title="Tin tuyển dụng"
        description="Theo dõi trạng thái duyệt và tiếp tục hoàn thiện các bản nháp của bạn."
        actions={
          <Link href="/recruiter/jobs/new" className={buttonClasses('primary')}>
            <Plus className="size-4" aria-hidden /> Đăng tin mới
          </Link>
        }
      />

      {submitted && (
        <p
          role="status"
          className="mb-4 flex items-center gap-2 rounded-card bg-success-subtle p-4 text-sm font-medium text-success"
        >
          <CheckCircle2 className="size-5 shrink-0" aria-hidden />
          Đã gửi tin “{submitted.title}”. Tin đang chờ quản trị viên duyệt.
        </p>
      )}

      <div
        role="group"
        aria-label="Lọc theo trạng thái"
        className="mb-4 flex gap-1 overflow-x-auto rounded-card bg-surface p-1 shadow-card"
      >
        {TABS.map((tab) => {
          const active = tab === status;
          return (
            <button
              key={tab}
              type="button"
              aria-pressed={active}
              onClick={() => selectStatus(tab)}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-control px-3 py-2 text-sm font-semibold transition-colors',
                'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground',
              )}
            >
              {tabLabel(tab)}
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 font-mono text-xs',
                  active ? 'bg-primary-hover text-primary-foreground' : 'bg-surface-strong',
                )}
              >
                {counts[tab]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Tìm theo vị trí</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo vị trí tuyển dụng…"
            className="min-h-11 w-full rounded-control border border-input bg-surface pr-3 pl-9 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
          />
        </label>
        <label className="sm:w-48">
          <span className="sr-only">Lọc theo cấp bậc</span>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as JobLevel | '')}
            className="min-h-11 w-full rounded-control border border-input bg-surface px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
          >
            <option value="">Mọi cấp bậc</option>
            {JOB_LEVELS.map((value) => (
              <option key={value} value={value}>
                {JOB_LEVEL_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="rounded-card bg-danger-subtle p-4 text-sm text-danger">{error}</p>}
      {!jobs && !error && (
        <div className="space-y-2" aria-label="Đang tải">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-card bg-surface shadow-card" />
          ))}
        </div>
      )}

      {jobs && jobs.length === 0 && (
        <Card className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary-subtle text-primary">
            <BriefcaseBusiness className="size-6" aria-hidden />
          </span>
          <p className="font-display text-lg font-semibold text-foreground">
            Bạn chưa có tin tuyển dụng nào
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Đăng tin đầu tiên với quy trình tuyển dụng rõ ràng để ứng viên biết chính xác điều gì
            đang chờ họ.
          </p>
          <Link href="/recruiter/jobs/new" className={buttonClasses('primary', 'mt-2')}>
            <Plus className="size-4" aria-hidden /> Đăng tin mới
          </Link>
        </Card>
      )}

      {jobs && jobs.length > 0 && (
        <Card className="overflow-hidden p-0">
          <div className="hidden grid-cols-12 gap-4 bg-surface-muted px-5 py-3 text-xs font-semibold tracking-wide text-subtle-foreground uppercase md:grid">
            <span className="col-span-6">Vị trí tuyển dụng</span>
            <span className="col-span-2">Trạng thái</span>
            <span className="col-span-2">Cập nhật</span>
            <span className="col-span-2 text-right">Thao tác</span>
          </div>
          {visible.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              {filtering
                ? 'Không có tin nào khớp với bộ lọc hiện tại.'
                : 'Không có tin tuyển dụng nào.'}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {visible.map((job) => (
                <JobRow key={job.id} job={job} />
              ))}
            </ul>
          )}
        </Card>
      )}
    </>
  );
}

function JobRow({ job }: { job: RecruiterJobListItem }) {
  const editable = isJobEditable(job.status);
  return (
    <li className="grid grid-cols-1 gap-3 px-5 py-4 transition-colors hover:bg-surface-muted md:grid-cols-12 md:items-center md:gap-4">
      <div className="min-w-0 md:col-span-6">
        <Link
          href={`/recruiter/jobs/${job.id}`}
          className="font-display font-semibold text-foreground hover:text-primary"
        >
          {job.title}
        </Link>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {JOB_LEVEL_LABELS[job.level]} · {job.location}
        </p>
        {job.status === 'REJECTED' && job.moderationReason && (
          <p className="mt-1 text-sm text-danger">Lý do từ chối: {job.moderationReason}</p>
        )}
      </div>
      <div className="md:col-span-2">
        <JobStatusBadge status={job.status} />
      </div>
      <p className="text-sm text-muted-foreground md:col-span-2">
        {dateFormat.format(new Date(job.updatedAt))}
      </p>
      <div className="flex gap-2 md:col-span-2 md:justify-end">
        {editable ? (
          <Link
            href={`/recruiter/jobs/${job.id}/edit`}
            className={buttonClasses('soft')}
            aria-label={`Tiếp tục chỉnh sửa ${job.title}`}
          >
            Chỉnh sửa
          </Link>
        ) : (
          <Link
            href={`/recruiter/jobs/${job.id}`}
            className={buttonClasses('ghost')}
            aria-label={`Xem chi tiết ${job.title}`}
          >
            Xem chi tiết
          </Link>
        )}
      </div>
    </li>
  );
}
