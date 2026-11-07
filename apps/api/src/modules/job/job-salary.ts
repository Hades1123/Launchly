import type { PublicSalary } from '@launchly/shared';

/** Prisma `select` fragment: spread into any public job query that needs salary. */
export const salarySelect = {
  salaryMin: true,
  salaryMax: true,
  salaryHidden: true,
} as const;

type SalaryRow = {
  salaryMin: { toNumber(): number } | null;
  salaryMax: { toNumber(): number } | null;
  salaryHidden: boolean;
};

/**
 * The single place that decides what salary a candidate may see. Public job
 * detail and search (SCRUM-28/29) must map rows through this, never by hand,
 * so a hidden salary cannot leak.
 */
export function toPublicSalary(job: SalaryRow): PublicSalary {
  if (job.salaryHidden) return { negotiable: true, min: null, max: null };
  return {
    negotiable: false,
    min: job.salaryMin?.toNumber() ?? null,
    max: job.salaryMax?.toNumber() ?? null,
  };
}
