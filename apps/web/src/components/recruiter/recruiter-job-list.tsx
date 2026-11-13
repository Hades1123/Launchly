'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { isJobEditable, type RecruiterJobListItem } from '@launchly/shared';
import { buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { JOB_LEVEL_LABELS, JobStatusBadge } from '@/components/recruiter/job-status-badge';
import { listMyJobs } from '@/lib/api/recruiter-jobs';
import { useAuth } from '@/lib/auth-context';

const dateFormat = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });

/** The signed-in recruiter's jobs in every status, with a way back into drafts. */
export function RecruiterJobList({ submittedId }: { submittedId?: string }) {
  const { status } = useAuth();
  const [jobs, setJobs] = useState<RecruiterJobListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') return;
    let active = true;
    async function load() {
      try {
        const result = await listMyJobs();
        if (active) setJobs(result.jobs);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Không thể tải danh sách.');
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [status]);

  if (status !== 'authenticated' && status !== 'loading') {
    return (
      <p className="text-sm text-muted-foreground">
        Vui lòng đăng nhập bằng tài khoản nhà tuyển dụng.
      </p>
    );
  }

  const submitted = jobs?.find((job) => job.id === submittedId);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link href="/recruiter/jobs/new" className={buttonClasses('primary')}>
          <Plus className="size-4" aria-hidden /> Đăng tin mới
        </Link>
      </div>
      {submitted && (
        <p role="status" className="rounded-card bg-success-subtle p-4 text-sm text-success">
          Đã gửi tin “{submitted.title}”. Tin đang chờ quản trị viên duyệt.
        </p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
      {!jobs && !error && <p className="text-sm text-muted-foreground">Đang tải…</p>}
      {jobs?.length === 0 && (
        <Card className="text-sm text-muted-foreground">Bạn chưa có tin tuyển dụng nào.</Card>
      )}
      <ul className="space-y-3">
        {jobs?.map((job) => (
          <li key={job.id}>
            <Card className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-base font-semibold text-foreground">
                    {job.title}
                  </h2>
                  <JobStatusBadge status={job.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {JOB_LEVEL_LABELS[job.level]} · {job.location} · Cập nhật{' '}
                  {dateFormat.format(new Date(job.updatedAt))}
                </p>
                {job.status === 'REJECTED' && job.moderationReason && (
                  <p className="text-sm text-danger">Lý do từ chối: {job.moderationReason}</p>
                )}
              </div>
              {isJobEditable(job.status) && (
                <Link
                  href={`/recruiter/jobs/${job.id}/edit`}
                  className={buttonClasses('soft')}
                  aria-label={`Tiếp tục chỉnh sửa ${job.title}`}
                >
                  Tiếp tục chỉnh sửa
                </Link>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
