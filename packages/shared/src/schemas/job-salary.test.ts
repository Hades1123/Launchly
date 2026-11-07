import { describe, expect, it } from 'vitest';
import { publicSalarySchema } from './job-salary';

describe('publicSalarySchema', () => {
  it.each([
    { negotiable: true, min: null, max: null },
    { negotiable: false, min: 2000, max: 4000 },
    { negotiable: false, min: null, max: null },
  ])('accepts %j', (v) => {
    expect(publicSalarySchema.safeParse(v).success).toBe(true);
  });

  it('rejects a missing negotiable flag', () => {
    expect(publicSalarySchema.safeParse({ min: 1, max: 2 }).success).toBe(false);
  });
});
