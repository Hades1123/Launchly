import type { JobLevel, JobPublicationStatus, RecruiterJob } from '@launchly/shared';
import { Badge, type BadgeTone } from '@/components/ui/badge';

export const JOB_LEVEL_LABELS: Record<JobLevel, string> = {
  INTERN: 'Intern',
  FRESHER: 'Fresher',
  JUNIOR: 'Junior',
};

/** What a draft saved without a title is called in lists, headings and labels. */
export function jobTitleText(title: string): string {
  return title.trim() || 'Bản nháp chưa đặt tên';
}

/** "Intern · Remote", leaving out whatever a draft does not have yet. */
export function jobMetaText(job: { level: JobLevel | null; location: string }): string {
  const parts = [job.level ? JOB_LEVEL_LABELS[job.level] : '', job.location].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : 'Chưa chọn cấp bậc và địa điểm';
}

const usd = (value: number) => `$${value.toLocaleString('en-US')}`;

/** The recruiter's view of a salary; candidates never see the figures of a negotiable one. */
export function salaryText({ hidden, min, max }: RecruiterJob['salary']): string {
  if (hidden) return 'Thỏa thuận (ẩn với ứng viên)';
  if (min !== null && max !== null) return `${usd(min)} – ${usd(max)} / tháng`;
  if (min !== null) return `Từ ${usd(min)} / tháng`;
  if (max !== null) return `Đến ${usd(max)} / tháng`;
  return 'Chưa nhập';
}

const statusView: Record<JobPublicationStatus, { label: string; tone: BadgeTone }> = {
  DRAFT: { label: 'Bản nháp', tone: 'neutral' },
  PENDING: { label: 'Chờ duyệt', tone: 'warning' },
  PUBLISHED: { label: 'Đã duyệt', tone: 'success' },
  REJECTED: { label: 'Bị từ chối', tone: 'danger' },
  CLOSED: { label: 'Đã đóng', tone: 'neutral' },
};

export function jobStatusLabel(status: JobPublicationStatus): string {
  return statusView[status].label;
}

export function JobStatusBadge({ status }: { status: JobPublicationStatus }) {
  const view = statusView[status];
  return (
    <Badge tone={view.tone} shape="pill">
      {view.label}
    </Badge>
  );
}
