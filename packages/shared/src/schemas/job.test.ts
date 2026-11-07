import { describe, expect, it } from 'vitest';
import { jobIdParamsSchema, publicJobDetailSchema } from './job';

const base = {
  id: 'j1',
  title: 'T',
  description: 'D',
  level: 'FRESHER',
  location: 'Hanoi',
  company: { id: 'c1', name: 'Acme' },
};

describe('public job schemas', () => {
  it.each([
    { negotiable: true, min: null, max: null },
    { negotiable: false, min: 1, max: 2 },
  ])('detail accepts salary %j', (salary) => {
    expect(publicJobDetailSchema.safeParse({ ...base, salary }).success).toBe(true);
  });

  it('detail rejects missing salary and bad level', () => {
    expect(publicJobDetailSchema.safeParse(base).success).toBe(false);
    expect(
      publicJobDetailSchema.safeParse({ ...base, level: 'MID', salary: { negotiable: true, min: null, max: null } })
        .success,
    ).toBe(false);
  });

  it('params reject non-uuid', () => {
    expect(jobIdParamsSchema.safeParse({ id: 'not-a-uuid' }).success).toBe(false);
    expect(jobIdParamsSchema.safeParse({ id: '00000000-0000-4000-8000-000000000401' }).success).toBe(true);
  });
});
