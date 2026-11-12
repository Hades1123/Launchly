import { describe, expect, it } from 'vitest';
import { createApplicationSchema } from './application';

const ids = {
  jobId: '11111111-1111-4111-8111-111111111111',
  resumeId: '22222222-2222-4222-8222-222222222222',
};

describe('createApplicationSchema', () => {
  it('accepts ids with and without a cover letter', () => {
    expect(createApplicationSchema.safeParse(ids).success).toBe(true);
    expect(createApplicationSchema.safeParse({ ...ids, coverLetter: 'Hello' }).success).toBe(true);
  });

  it('rejects non-uuid ids and a cover letter over 2000 characters', () => {
    expect(createApplicationSchema.safeParse({ ...ids, jobId: 'nope' }).success).toBe(false);
    expect(
      createApplicationSchema.safeParse({ ...ids, coverLetter: 'x'.repeat(2001) }).success,
    ).toBe(false);
    expect(
      createApplicationSchema.safeParse({ ...ids, coverLetter: 'x'.repeat(2000) }).success,
    ).toBe(true);
  });
});
