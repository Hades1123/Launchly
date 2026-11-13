import { describe, expect, it } from 'vitest';
import {
  applicationIdParamsSchema,
  candidateApplicationDetailSchema,
  candidateApplicationListSchema,
  createApplicationSchema,
} from './application';

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

describe('candidate application DTOs', () => {
  const item = {
    id: 'a1',
    jobId: 'j1',
    jobTitle: 'Dev',
    companyName: 'Acme',
    status: 'SUBMITTED',
    currentStageName: null,
    submittedAt: '2026-11-10T00:00:00.000Z',
    updatedAt: '2026-11-10T00:00:00.000Z',
  };

  it('list and detail DTOs parse', () => {
    expect(candidateApplicationListSchema.safeParse({ data: [item] }).success).toBe(true);
    expect(
      candidateApplicationListSchema.safeParse({ data: [{ ...item, status: 'X' }] }).success,
    ).toBe(false);
    const detail = {
      ...item,
      resumeId: 'r1',
      coverLetter: null,
      history: [
        { fromStatus: null, toStatus: 'SUBMITTED', note: null, changedAt: item.submittedAt },
      ],
      stages: [{ id: 's1', name: 'Screening', position: 1 }],
    };
    expect(candidateApplicationDetailSchema.safeParse(detail).success).toBe(true);
    expect(
      candidateApplicationDetailSchema.safeParse({ ...detail, history: undefined }).success,
    ).toBe(false);
  });

  it('params need a uuid', () => {
    expect(applicationIdParamsSchema.safeParse({ id: 'nope' }).success).toBe(false);
    expect(
      applicationIdParamsSchema.safeParse({ id: '11111111-1111-4111-8111-111111111111' }).success,
    ).toBe(true);
  });
});
