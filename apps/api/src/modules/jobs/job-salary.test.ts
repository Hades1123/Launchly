import { Prisma } from '@/generated/prisma/client';
import { publicSalarySchema } from '@launchly/shared';
import { describe, expect, it } from 'vitest';
import { toPublicSalary } from './job-salary';

const d = (n: number) => new Prisma.Decimal(n);

describe('toPublicSalary', () => {
  it('returns the real range when visible', () => {
    expect(toPublicSalary({ salaryMin: d(2000), salaryMax: d(4000), salaryHidden: false })).toEqual({
      negotiable: false,
      min: 2000,
      max: 4000,
    });
  });

  it('never exposes real figures when hidden', () => {
    const out = toPublicSalary({ salaryMin: d(2000), salaryMax: d(4000), salaryHidden: true });
    expect(out).toEqual({ negotiable: true, min: null, max: null });
    expect(JSON.stringify(out)).not.toMatch(/2000|4000/);
  });

  it('handles unset salary and matches the shared schema', () => {
    const out = toPublicSalary({ salaryMin: null, salaryMax: null, salaryHidden: false });
    expect(out).toEqual({ negotiable: false, min: null, max: null });
    expect(publicSalarySchema.safeParse(out).success).toBe(true);
  });
});
