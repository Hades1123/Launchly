'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { ExternalLink, ListOrdered, Pencil } from 'lucide-react';
import type { RecruiterJob } from '@launchly/shared';
import { JOB_LEVEL_LABELS, JobStatusBadge } from '@/components/recruiter/job-status-badge';
import { RecruiterPageHeader } from '@/components/recruiter/recruiter-shell';
import { ROUND_FORMAT_OPTIONS } from '@/components/recruiter/round-rows-editor';
import { buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ApiError } from '@/lib/api/http';
import { getMyJob } from '@/lib/api/recruiter-jobs';
import { cn } from '@/lib/cn';

const dateFormat = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });

const usd = (value: number) => `$${value.toLocaleString('en-US')}`;

function salaryText({ hidden, min, max }: RecruiterJob['salary']): string {
  if (hidden) return 'Thỏa thuận (ẩn với ứng viên)';
  if (min !== null && max !== null) return `${usd(min)} – ${usd(max)} / tháng`;
  if (min !== null) return `Từ ${usd(min)} / tháng`;
  if (max !== null) return `Đến ${usd(max)} / tháng`;
  return 'Chưa nhập';
}

function StatusPanel({ job }: { job: RecruiterJob }) {
  const view = {
    DRAFT: { tone: 'bg-surface-muted text-muted-foreground', text: 'Bản nháp chỉ bạn nhìn thấy.' },
    PENDING: {
      tone: 'bg-warning-subtle text-warning',
      text: 'Tin đang chờ quản trị viên duyệt và sẽ hiển thị cho ứng viên sau khi được duyệt.',
    },
    PUBLISHED: { tone: 'bg-success-subtle text-success', text: 'Tin đang hiển thị cho ứng viên.' },
    REJECTED: { tone: 'bg-danger-subtle text-danger', text: 'Tin đã bị quản trị viên từ chối.' },
    CLOSED: { tone: 'bg-surface-muted text-muted-foreground', text: 'Tin đã đóng.' },
  }[job.status];
  return (
    <div role="status" className={cn('rounded-card p-4 text-sm', view.tone)}>
      <p className="font-medium">{view.text}</p>
      {job.status === 'REJECTED' && job.moderationReason && (
        <p className="mt-1">Lý do: {job.moderationReason}</p>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="space-y-3">
      <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>
      {children}
    </Card>
  );
}

function BulletList({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-subtle-foreground">{empty}</p>;
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

/** Read-only view of one of the recruiter's jobs, whatever its status. */
export function RecruiterJobDetail({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<RecruiterJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const result = await getMyJob(jobId);
        if (active) setJob(result);
      } catch (cause) {
        if (!active) return;
        setError(
          cause instanceof ApiError && cause.code === 'FORBIDDEN'
            ? 'Bạn không có quyền xem tin tuyển dụng này.'
            : cause instanceof ApiError && cause.code === 'NOT_FOUND'
              ? 'Không tìm thấy tin tuyển dụng.'
              : 'Không thể tải tin tuyển dụng. Vui lòng thử lại.',
        );
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [jobId]);

  const back = { href: '/recruiter/jobs', label: 'Tin tuyển dụng' };

  if (error) {
    return (
      <>
        <RecruiterPageHeader title="Chi tiết tin tuyển dụng" back={back} />
        <p role="status" className="rounded-card bg-danger-subtle p-4 text-sm text-danger">
          {error}
        </p>
      </>
    );
  }
  if (!job) {
    return (
      <>
        <RecruiterPageHeader title="Chi tiết tin tuyển dụng" back={back} />
        <div className="h-64 animate-pulse rounded-card bg-surface shadow-card" />
      </>
    );
  }

  return (
    <>
      <RecruiterPageHeader
        back={back}
        title={job.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <JobStatusBadge status={job.status} />
            {JOB_LEVEL_LABELS[job.level]} · {job.location}
          </span>
        }
        actions={
          <>
            {job.status === 'DRAFT' && (
              <Link href={`/recruiter/jobs/${job.id}/edit`} className={buttonClasses('primary')}>
                <Pencil className="size-4" aria-hidden /> Chỉnh sửa
              </Link>
            )}
            {job.status === 'PUBLISHED' && (
              <>
                <Link href={`/recruiter/jobs/${job.id}/rounds`} className={buttonClasses('soft')}>
                  <ListOrdered className="size-4" aria-hidden /> Sửa quy trình
                </Link>
                <Link href={`/jobs?job=${job.id}`} className={buttonClasses('primary')}>
                  <ExternalLink className="size-4" aria-hidden /> Xem tin công khai
                </Link>
              </>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section title="Mô tả công việc">
            <p className="text-sm whitespace-pre-line text-foreground">{job.description}</p>
          </Section>
          <div className="grid gap-6 md:grid-cols-2">
            <Section title="Yêu cầu">
              <BulletList items={job.requirements} empty="Chưa có yêu cầu." />
            </Section>
            <Section title="Quyền lợi">
              <BulletList items={job.benefits} empty="Chưa có quyền lợi." />
            </Section>
          </div>
          <Section title="Quy trình tuyển dụng">
            {job.rounds.length === 0 ? (
              <p className="text-sm text-subtle-foreground">Chưa có vòng tuyển dụng.</p>
            ) : (
              <ol className="space-y-3">
                {job.rounds.map((round) => (
                  <li key={round.id} className="flex gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-subtle font-mono text-sm text-primary-subtle-foreground">
                      {round.position}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {round.name || 'Chưa đặt tên'}
                      </p>
                      <p className="text-xs text-subtle-foreground">
                        {[
                          round.format ? ROUND_FORMAT_OPTIONS[round.format] : 'Chưa chọn hình thức',
                          round.estimatedDurationMinutes !== null
                            ? `${round.estimatedDurationMinutes} phút`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Section>
          <Section title="Ghi chú cho ứng viên">
            <BulletList items={job.notes.map((n) => n.content)} empty="Chưa có ghi chú." />
          </Section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
          <StatusPanel job={job} />
          <Card className="space-y-3 text-sm">
            <h2 className="font-display text-lg font-semibold text-foreground">Thông tin</h2>
            <dl className="space-y-2">
              {[
                ['Cấp bậc', JOB_LEVEL_LABELS[job.level]],
                ['Địa điểm', job.location],
                ['Ngành nghề', job.industry ?? 'Chưa chọn'],
                ['Mức lương', salaryText(job.salary)],
                ['Ngày tạo', dateFormat.format(new Date(job.createdAt))],
                ['Cập nhật', dateFormat.format(new Date(job.updatedAt))],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-subtle-foreground">{label}</dt>
                  <dd className="text-right font-medium text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </aside>
      </div>
    </>
  );
}
