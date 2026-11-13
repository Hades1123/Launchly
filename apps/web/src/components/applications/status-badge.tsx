import type { ApplicationStatus } from '@launchly/shared';
import { Badge, type BadgeTone } from '@/components/ui/badge';

export const statusConfig: Record<ApplicationStatus, { label: string; tone: BadgeTone }> = {
  SUBMITTED: { label: 'Submitted', tone: 'neutral' },
  SCREENING: { label: 'Screening', tone: 'primary' },
  INTERVIEW: { label: 'Interview', tone: 'primary' },
  OFFER: { label: 'Offer', tone: 'success' },
  ACCEPTED: { label: 'Accepted', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
  WITHDRAWN: { label: 'Withdrawn', tone: 'neutral' },
};

/** Statuses that end the application; nothing happens after them. */
const FINAL_STATUSES: readonly ApplicationStatus[] = ['REJECTED', 'WITHDRAWN'];

export function isFinalStatus(status: ApplicationStatus): boolean {
  return FINAL_STATUSES.includes(status);
}

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  const { label, tone } = statusConfig[status];
  return (
    <span className="inline-flex items-center gap-1.5">
      <Badge tone={tone} shape="pill">
        {label}
      </Badge>
      {isFinalStatus(status) && (
        <span className="text-xs font-semibold text-subtle-foreground">Final</span>
      )}
    </span>
  );
}
