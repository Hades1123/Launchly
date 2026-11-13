import type { JobLevel, JobPublicationStatus } from '@launchly/shared';
import { Badge, type BadgeTone } from '@/components/ui/badge';

export const JOB_LEVEL_LABELS: Record<JobLevel, string> = {
  INTERN: 'Intern',
  FRESHER: 'Fresher',
  SENIOR: 'Senior',
};

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
