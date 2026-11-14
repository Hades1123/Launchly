import type { useTranslations } from 'next-intl';
import type { BadgeTone } from '@/components/ui/badge';
import type { JobLevel, PublicSalary } from '@launchly/shared';

/** Translator for the `jobs` namespace: `useTranslations('jobs')` or `await getTranslations('jobs')`. */
export type JobsTranslator = ReturnType<typeof useTranslations<'jobs'>>;

/** Badge tone per level; the label is `t('levels.<LEVEL>')` in the `jobs` namespace. */
export const levelConfig: Record<JobLevel, { tone: BadgeTone }> = {
  INTERN: { tone: 'neutral' },
  FRESHER: { tone: 'success' },
  JUNIOR: { tone: 'primary' },
};

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'CO';
  const first = parts[0]?.[0] ?? 'C';
  const last = parts[parts.length - 1]?.[0] ?? first;
  return (first + last).toUpperCase();
}

/** Salary text in the active language; amounts are passed as strings so they keep plain digits. */
export function formatSalary({ negotiable, min, max }: PublicSalary, t: JobsTranslator): string {
  if (negotiable) return t('salary.negotiable');
  if (min !== null && max !== null) return `$${min} - $${max}`;
  if (min !== null) return t('salary.from', { min: String(min) });
  if (max !== null) return t('salary.upTo', { max: String(max) });
  return t('salary.negotiable');
}
