import { useTranslations } from 'next-intl';
import type { JobLevel, JobPublicationStatus, RecruiterJob } from '@launchly/shared';
import { Badge, type BadgeTone } from '@/components/ui/badge';

const statusTone: Record<JobPublicationStatus, BadgeTone> = {
  DRAFT: 'neutral',
  PENDING: 'warning',
  PUBLISHED: 'success',
  REJECTED: 'danger',
  CLOSED: 'neutral',
};

/**
 * Display text for a recruiter's job in the active language: level and status labels, the title
 * of a draft saved without one, the "Intern · Remote" meta line and the salary.
 */
export function useJobText() {
  const t = useTranslations('recruiter.job');
  const level = (value: JobLevel) => t(`levels.${value}`);
  return {
    level,
    status: (value: JobPublicationStatus) => t(`statuses.${value}`),
    /** What a draft saved without a title is called in lists, headings and labels. */
    title: (title: string) => title.trim() || t('untitled'),
    /** "Intern · Remote", leaving out whatever a draft does not have yet. */
    meta: (job: { level: JobLevel | null; location: string }) => {
      const parts = [job.level ? level(job.level) : '', job.location].filter(Boolean);
      return parts.length > 0 ? parts.join(' · ') : t('noMeta');
    },
    /** The recruiter's view of a salary; candidates never see the figures of a negotiable one. */
    salary: ({ hidden, min, max }: RecruiterJob['salary']) => {
      if (hidden) return t('salary.hidden');
      if (min !== null && max !== null) return t('salary.range', { min, max });
      if (min !== null) return t('salary.from', { min });
      if (max !== null) return t('salary.upTo', { max });
      return t('salary.empty');
    },
  };
}

export function JobStatusBadge({ status }: { status: JobPublicationStatus }) {
  const t = useTranslations('recruiter.job.statuses');
  return (
    <Badge tone={statusTone[status]} shape="pill">
      {t(status)}
    </Badge>
  );
}
