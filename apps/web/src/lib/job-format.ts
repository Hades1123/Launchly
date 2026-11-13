import type { BadgeTone } from '@/components/ui/badge';
import type { JobLevel, PublicSalary } from '@launchly/shared';

export const levelConfig: Record<JobLevel, { label: string; tone: BadgeTone }> = {
  INTERN: { label: 'Intern', tone: 'neutral' },
  FRESHER: { label: 'Fresher', tone: 'success' },
  SENIOR: { label: 'Senior', tone: 'primary' },
};

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'CO';
  const first = parts[0]?.[0] ?? 'C';
  const last = parts[parts.length - 1]?.[0] ?? first;
  return (first + last).toUpperCase();
}

export function formatSalary({ negotiable, min, max }: PublicSalary): string {
  if (negotiable) return 'Negotiable';
  if (min !== null && max !== null) return `$${min} - $${max}`;
  if (min !== null) return `From $${min}`;
  if (max !== null) return `Up to $${max}`;
  return 'Negotiable';
}
