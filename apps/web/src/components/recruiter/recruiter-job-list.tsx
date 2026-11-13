'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type MouseEvent } from 'react';
import {
  BriefcaseBusiness,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
} from 'lucide-react';
import {
  JOB_LEVELS,
  JOB_PUBLICATION_STATUSES,
  RECRUITER_JOBS_PAGE_SIZE,
  isJobDeletable,
  isJobEditable,
  type JobLevel,
  type RecruiterJobListItem,
  type RecruiterJobListResponse,
  type RecruiterJobStatusFilter,
} from '@launchly/shared';
import { DeleteDraftButton, DeleteDraftsButton } from '@/components/recruiter/delete-draft-button';
import {
  JOB_LEVEL_LABELS,
  JobStatusBadge,
  jobMetaText,
  jobStatusLabel,
  jobTitleText,
} from '@/components/recruiter/job-status-badge';
import { RecruiterPageHeader } from '@/components/recruiter/recruiter-shell';
import { buttonClasses } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { listMyJobs } from '@/lib/api/recruiter-jobs';
import { cn } from '@/lib/cn';

export type JobListFilters = {
  status: RecruiterJobStatusFilter;
  q: string;
  level: JobLevel | '';
  page: number;
};

type Flash =
  { kind: 'submitted'; id: string } | { kind: 'deleted'; title?: string; count?: number };

const TABS: RecruiterJobStatusFilter[] = ['ALL', ...JOB_PUBLICATION_STATUSES];

const dateFormat = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });

const tabLabel = (tab: RecruiterJobStatusFilter) =>
  tab === 'ALL' ? 'Tất cả' : jobStatusLabel(tab);

/** The list URL for a set of filters; defaults are left out. */
function listUrl(pathname: string, { status, q, level, page }: JobListFilters): string {
  const search = new URLSearchParams();
  if (status !== 'ALL') search.set('status', status);
  if (q) search.set('q', q);
  if (level) search.set('level', level);
  if (page > 1) search.set('page', String(page));
  const qs = search.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/** The recruiter's jobs, paged on the server, with status tabs, a title search and a level filter. */
export function RecruiterJobList({
  initialFilters,
  submittedId,
  deleted,
}: {
  initialFilters: JobListFilters;
  submittedId?: string;
  deleted?: boolean;
}) {
  const pathname = usePathname();
  const [filters, setFilters] = useState<JobListFilters>(initialFilters);
  const [searchText, setSearchText] = useState(initialFilters.q);
  const [data, setData] = useState<RecruiterJobListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  /** Drafts ticked on the current page, for bulk delete. */
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [flash, setFlash] = useState<Flash | null>(
    submittedId ? { kind: 'submitted', id: submittedId } : deleted ? { kind: 'deleted' } : null,
  );

  // Keep the filters in the address bar so a reload or a shared link shows the same page.
  // `replaceState` avoids a server round trip; Next.js keeps it in sync with its router.
  useEffect(() => {
    window.history.replaceState(null, '', listUrl(pathname, filters));
  }, [pathname, filters]);

  // Search as the recruiter types, once they pause.
  useEffect(() => {
    const q = searchText.trim();
    if (q === filters.q) return;
    const timer = setTimeout(() => setFilters((f) => ({ ...f, q, page: 1 })), 300);
    return () => clearTimeout(timer);
  }, [searchText, filters.q]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      try {
        const result = await listMyJobs(
          {
            status: filters.status === 'ALL' ? undefined : filters.status,
            q: filters.q || undefined,
            level: filters.level || undefined,
            page: filters.page,
            limit: RECRUITER_JOBS_PAGE_SIZE,
          },
          controller.signal,
        );
        // Past the last page (e.g. after deleting its only job): show the last page instead.
        if (result.jobs.length === 0 && filters.page > 1) {
          setFilters((f) => ({ ...f, page: Math.max(1, result.pagination.totalPages) }));
          return;
        }
        setData(result);
        // Keep the ticks on drafts still listed: a search finishing after the recruiter ticked
        // must not clear the selection (and close the confirm dialog). Jobs no longer listed,
        // such as deleted ones or ones on another page, drop out.
        setSelected((current) => {
          const listed = new Set(result.jobs.map((job) => job.id));
          return new Set([...current].filter((id) => listed.has(id)));
        });
        setError(null);
        setLoading(false);
      } catch {
        if (controller.signal.aborted) return;
        setError('Không thể tải danh sách tin tuyển dụng. Vui lòng thử lại.');
        setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [filters, reloadKey]);

  /** Changes filters (back to page 1 unless a page is given) and clears the last flash. */
  function update(next: Partial<JobListFilters>) {
    setFlash(null);
    setFilters((f) => ({ ...f, page: 1, ...next }));
  }

  function onDeleted(job: RecruiterJobListItem) {
    setFlash({ kind: 'deleted', title: jobTitleText(job.title) });
    setReloadKey((k) => k + 1);
  }

  function onBulkDeleted(count: number) {
    setFlash({ kind: 'deleted', count });
    setReloadKey((k) => k + 1);
  }

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  const jobs = data?.jobs;
  const submittedTitle =
    flash?.kind === 'submitted'
      ? jobs?.find((job) => job.id === flash.id)?.title.trim()
      : undefined;
  const filtering = filters.status !== 'ALL' || filters.level !== '' || filters.q !== '';
  const hasNoJobsAtAll = data !== null && data.counts.ALL === 0 && !filters.q && !filters.level;
  const pageDrafts = (jobs ?? []).filter((job) => isJobDeletable(job.status));
  const selectedDrafts = pageDrafts.filter((job) => selected.has(job.id));
  const allSelected = pageDrafts.length > 0 && selectedDrafts.length === pageDrafts.length;

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

      {flash && (flash.kind === 'deleted' || jobs) && (
        <p
          role="status"
          className="mb-4 flex items-center gap-2 rounded-card bg-success-subtle p-4 text-sm font-medium text-success"
        >
          <CheckCircle2 className="size-5 shrink-0" aria-hidden />
          {flash.kind === 'deleted'
            ? flash.title
              ? `Đã xóa bản nháp “${flash.title}”.`
              : flash.count
                ? `Đã xóa ${flash.count} bản nháp.`
                : 'Đã xóa bản nháp.'
            : submittedTitle
              ? `Đã gửi tin “${submittedTitle}”. Tin đang chờ quản trị viên duyệt.`
              : 'Đã gửi tin. Tin đang chờ quản trị viên duyệt.'}
        </p>
      )}

      <div
        role="group"
        aria-label="Lọc theo trạng thái"
        className="mb-4 flex gap-1 overflow-x-auto rounded-card bg-surface p-1 shadow-card"
      >
        {TABS.map((tab) => {
          const active = tab === filters.status;
          return (
            <button
              key={tab}
              type="button"
              aria-pressed={active}
              onClick={() => update({ status: tab })}
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
                {data?.counts[tab] ?? '–'}
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
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Tìm theo vị trí tuyển dụng…"
            className="min-h-11 w-full rounded-control border border-input bg-surface pr-3 pl-9 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
          />
        </label>
        <label className="sm:w-48">
          <span className="sr-only">Lọc theo cấp bậc</span>
          <select
            value={filters.level}
            onChange={(e) => update({ level: e.target.value as JobLevel | '' })}
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
      {!data && !error && (
        <div className="space-y-2" aria-label="Đang tải">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-card bg-surface shadow-card" />
          ))}
        </div>
      )}

      {hasNoJobsAtAll && (
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

      {data && !hasNoJobsAtAll && (
        <Card
          className={cn('overflow-hidden p-0 transition-opacity', loading && 'opacity-60')}
          aria-busy={loading}
        >
          {pageDrafts.length > 0 && (
            <div
              className={cn(
                'flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-1.5',
                selectedDrafts.length > 0 && 'bg-primary-subtle',
              )}
            >
              <label className="-ml-3 flex cursor-pointer items-center gap-1 text-sm font-semibold text-foreground">
                <Checkbox
                  checked={allSelected}
                  indeterminate={selectedDrafts.length > 0 && !allSelected}
                  onChange={() =>
                    setSelected(allSelected ? new Set() : new Set(pageDrafts.map((job) => job.id)))
                  }
                />
                {selectedDrafts.length > 0
                  ? `Đã chọn ${selectedDrafts.length} bản nháp`
                  : `Chọn tất cả bản nháp trên trang (${pageDrafts.length})`}
              </label>
              {selectedDrafts.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelected(new Set())}
                    className={buttonClasses('ghost')}
                  >
                    Bỏ chọn
                  </button>
                  <DeleteDraftsButton
                    jobs={selectedDrafts}
                    onDeleted={() => onBulkDeleted(selectedDrafts.length)}
                  />
                </div>
              )}
            </div>
          )}
          <div className="hidden grid-cols-12 gap-4 bg-surface-muted px-5 py-3 text-xs font-semibold tracking-wide text-subtle-foreground uppercase md:grid">
            <span className={cn('col-span-4', pageDrafts.length > 0 && 'pl-11')}>
              Vị trí tuyển dụng
            </span>
            <span className="col-span-2">Trạng thái</span>
            <span className="col-span-1">Ứng viên</span>
            <span className="col-span-2">Cập nhật</span>
            <span className="col-span-3 text-right">Thao tác</span>
          </div>
          {data.jobs.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              {filtering
                ? 'Không có tin nào khớp với bộ lọc hiện tại.'
                : 'Không có tin tuyển dụng nào.'}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {data.jobs.map((job) => (
                <JobRow
                  key={job.id}
                  job={job}
                  selectable={pageDrafts.length > 0}
                  selected={selected.has(job.id)}
                  onToggle={() => toggle(job.id)}
                  onDeleted={() => onDeleted(job)}
                />
              ))}
            </ul>
          )}
          <Pagination pagination={data.pagination} onPage={(page) => update({ page })} />
        </Card>
      )}
    </>
  );
}

function JobRow({
  job,
  selectable,
  selected,
  onToggle,
  onDeleted,
}: {
  job: RecruiterJobListItem;
  /** Whether the page has drafts, so every row keeps the checkbox column aligned. */
  selectable: boolean;
  selected: boolean;
  onToggle: () => void;
  onDeleted: () => void;
}) {
  const editable = isJobEditable(job.status);
  const deletable = isJobDeletable(job.status);
  const title = jobTitleText(job.title);
  /** Only published or closed jobs can have applicants; other rows show a dash and no link. */
  const hasApplicants = job.status === 'PUBLISHED' || job.status === 'CLOSED';

  /** A click on the empty part of a draft row toggles it, like a mail list; links keep working. */
  function onRowClick(event: MouseEvent<HTMLLIElement>) {
    if (!deletable) return;
    const target = event.target as HTMLElement;
    if (target.closest('a, button, input, label, dialog')) return;
    if (window.getSelection()?.toString()) return;
    onToggle();
  }

  return (
    // The checkbox is the accessible control; the row click is only a larger mouse target.
    <li
      onClick={onRowClick}
      className={cn(
        'grid grid-cols-1 gap-3 px-5 py-4 transition-colors hover:bg-surface-muted md:grid-cols-12 md:items-center md:gap-4',
        deletable && 'cursor-pointer',
        selected && 'bg-primary-subtle/50 hover:bg-primary-subtle/70',
      )}
    >
      <div className="flex min-w-0 gap-1 md:col-span-4">
        {selectable &&
          (deletable ? (
            <Checkbox
              className="-my-2.5 -ml-3"
              checked={selected}
              onChange={onToggle}
              aria-label={`Chọn ${title}`}
            />
          ) : (
            <span className="-ml-3 w-11 shrink-0" aria-hidden />
          ))}
        <div className="min-w-0">
          <Link
            href={`/recruiter/jobs/${job.id}`}
            className={cn(
              'font-display font-semibold hover:text-primary',
              job.title.trim() ? 'text-foreground' : 'text-muted-foreground italic',
            )}
          >
            {title}
          </Link>
          <p className="mt-0.5 text-sm text-muted-foreground">{jobMetaText(job)}</p>
          {job.status === 'REJECTED' && job.moderationReason && (
            <p className="mt-1 text-sm text-danger">Lý do từ chối: {job.moderationReason}</p>
          )}
        </div>
      </div>
      <div className="md:col-span-2">
        <JobStatusBadge status={job.status} />
      </div>
      <p className="text-sm text-muted-foreground md:col-span-1">
        {hasApplicants ? (
          <>
            <span className="md:sr-only">Ứng viên: </span>
            <span className="font-mono font-semibold text-foreground">{job.applicantCount}</span>
          </>
        ) : (
          <>
            <span className="md:sr-only">Ứng viên: </span>—
          </>
        )}
      </p>
      <p className="text-sm text-muted-foreground md:col-span-2">
        {dateFormat.format(new Date(job.updatedAt))}
      </p>
      <div className="flex flex-wrap gap-2 md:col-span-3 md:justify-end">
        {hasApplicants && (
          <Link
            href={`/recruiter/jobs/${job.id}/applicants`}
            className={buttonClasses('soft')}
            aria-label={`Xem ứng viên của ${title}`}
          >
            Xem ứng viên
          </Link>
        )}
        {editable ? (
          <>
            <Link
              href={`/recruiter/jobs/${job.id}/edit`}
              className={buttonClasses('soft')}
              aria-label={`Tiếp tục chỉnh sửa ${title}`}
            >
              {job.status === 'REJECTED' ? 'Sửa & gửi lại' : 'Chỉnh sửa'}
            </Link>
            {deletable && <DeleteDraftButton jobId={job.id} title={title} onDeleted={onDeleted} />}
          </>
        ) : (
          <Link
            href={`/recruiter/jobs/${job.id}`}
            className={buttonClasses('ghost')}
            aria-label={`Xem chi tiết ${title}`}
          >
            Xem chi tiết
          </Link>
        )}
      </div>
    </li>
  );
}

/** Page numbers around the current page, with gaps marked as `null`. */
function pageWindow(page: number, totalPages: number): (number | null)[] {
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1]! > 1 ? [null, p] : [p]));
}

function Pagination({
  pagination: { page, limit, total, totalPages },
  onPage,
}: {
  pagination: RecruiterJobListResponse['pagination'];
  onPage: (page: number) => void;
}) {
  if (total === 0) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  return (
    <nav
      aria-label="Phân trang"
      className="flex flex-col items-center justify-between gap-3 border-t border-border px-5 py-3 sm:flex-row"
    >
      <p className="text-sm text-muted-foreground">
        Hiển thị {from}–{to} trong {total} tin
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPage(page - 1)}
            disabled={page <= 1}
            aria-label="Trang trước"
            className={buttonClasses('ghost', 'px-2')}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          {pageWindow(page, totalPages).map((p, i) =>
            p === null ? (
              <span key={`gap-${i}`} className="px-2 text-sm text-subtle-foreground">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPage(p)}
                aria-label={`Trang ${p}`}
                aria-current={p === page ? 'page' : undefined}
                className={cn(
                  'min-w-9 rounded-control px-2 py-1.5 font-mono text-sm font-semibold transition-colors',
                  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  p === page
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground',
                )}
              >
                {p}
              </button>
            ),
          )}
          <button
            type="button"
            onClick={() => onPage(page + 1)}
            disabled={page >= totalPages}
            aria-label="Trang sau"
            className={buttonClasses('ghost', 'px-2')}
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
      )}
    </nav>
  );
}
