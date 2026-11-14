import type { ApplicationStatus } from '@launchly/shared';
import { useTranslations } from 'next-intl';
import { Badge, type BadgeTone } from '@/components/ui/badge';

/** Badge tone per status; the text comes from `candidate.applications.status.<STATUS>`. */
const STATUS_TONE: Record<ApplicationStatus, BadgeTone> = {
  SUBMITTED: 'neutral',
  SCREENING: 'primary',
  INTERVIEW: 'primary',
  OFFER: 'success',
  ACCEPTED: 'success',
  REJECTED: 'danger',
  WITHDRAWN: 'neutral',
};

/** Statuses that end the application; nothing happens after them. */
const FINAL_STATUSES: readonly ApplicationStatus[] = ['REJECTED', 'WITHDRAWN'];

export function isFinalStatus(status: ApplicationStatus): boolean {
  return FINAL_STATUSES.includes(status);
}

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  const t = useTranslations('candidate.applications.status');
  return (
    <span className="inline-flex items-center gap-1.5">
      <Badge tone={STATUS_TONE[status]} shape="pill">
        {t(status)}
      </Badge>
      {isFinalStatus(status) && (
        <span className="text-xs font-semibold text-subtle-foreground">{t('final')}</span>
      )}
    </span>
  );
}
