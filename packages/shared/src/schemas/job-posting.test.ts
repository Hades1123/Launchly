import { describe, expect, it } from 'vitest';
import {
  MAX_JOB_NOTES,
  RECRUITER_JOBS_PAGE_SIZE,
  bulkDeleteJobsSchema,
  isJobDeletable,
  isJobEditable,
  recruiterJobListItemSchema,
  recruiterJobListQuerySchema,
  saveJobSchema,
} from './job-posting';

const round = { name: 'Phỏng vấn kỹ thuật', format: 'ONLINE', estimatedDurationMinutes: 45 };

const submit = {
  action: 'SUBMIT',
  title: '  Thực tập sinh Backend  ',
  description: 'Xây dựng API cho sản phẩm.',
  level: 'INTERN',
  location: 'Ho Chi Minh City',
  industry: 'Technology',
  requirements: ['Biết Node.js'],
  benefits: ['Phụ cấp'],
  salary: { hidden: false, min: 300, max: 500 },
  rounds: [round],
  notes: ['Mang theo laptop.'],
};

const draft = {
  action: 'DRAFT',
  title: 'Bản nháp',
  description: 'Sẽ viết thêm.',
  level: 'FRESHER',
  location: 'Remote',
  industry: null,
  requirements: [],
  benefits: [],
  salary: { hidden: false, min: null, max: null },
  rounds: [{ name: '', format: null, estimatedDurationMinutes: null }],
  notes: [],
};

function issuePaths(input: unknown): string[] {
  const result = saveJobSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
}

describe('saveJobSchema: submit', () => {
  it('accepts a complete job and trims text', () => {
    const parsed = saveJobSchema.parse(submit);
    expect(parsed.title).toBe('Thực tập sinh Backend');
  });

  it('reports a missing position and level on their fields', () => {
    expect(issuePaths({ ...submit, title: ' ', level: '' })).toEqual(
      expect.arrayContaining(['title', 'level']),
    );
  });

  it('reports a round with an empty name or format on that round', () => {
    const paths = issuePaths({
      ...submit,
      rounds: [round, { name: '', format: null, estimatedDurationMinutes: 30 }],
    });
    expect(paths).toEqual(expect.arrayContaining(['rounds.1.name', 'rounds.1.format']));
    expect(paths.some((path) => path.startsWith('rounds.0'))).toBe(false);
  });

  it('requires at least one round and an industry', () => {
    expect(issuePaths({ ...submit, rounds: [], industry: null })).toEqual(
      expect.arrayContaining(['rounds', 'industry']),
    );
  });

  it(`blocks note number ${MAX_JOB_NOTES + 1} with "Maximum 5 notes"`, () => {
    const result = saveJobSchema.safeParse({ ...submit, notes: Array(6).fill('Ghi chú') });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({ path: ['notes'], message: 'Maximum 5 notes' });
    expect(saveJobSchema.safeParse({ ...submit, notes: Array(5).fill('Ghi chú') }).success).toBe(
      true,
    );
  });

  it('requires a salary unless it is negotiable', () => {
    const open = { hidden: false, min: null, max: null };
    expect(issuePaths({ ...submit, salary: open })).toEqual(['salary.min', 'salary.max']);
    expect(issuePaths({ ...submit, salary: { ...open, hidden: true } })).toEqual([]);
  });

  it('rejects a maximum below the minimum', () => {
    expect(issuePaths({ ...submit, salary: { hidden: false, min: 900, max: 100 } })).toEqual([
      'salary.max',
    ]);
  });

  it('only accepts the lookup values used by the search filters', () => {
    expect(issuePaths({ ...submit, location: 'Mars', industry: 'Mining' })).toEqual(
      expect.arrayContaining(['location', 'industry']),
    );
  });
});

describe('saveJobSchema: draft', () => {
  it('accepts incomplete rounds, no industry and no salary', () => {
    expect(saveJobSchema.safeParse(draft).success).toBe(true);
  });

  it('saves a blank draft: no title, description, level or location', () => {
    const blank = { ...draft, title: ' ', description: '', level: null, location: '', rounds: [] };
    const parsed = saveJobSchema.parse(blank);
    expect(parsed).toMatchObject({ title: '', level: null, location: '' });
  });

  it('skips the salary range rule but keeps types and length caps', () => {
    expect(issuePaths({ ...draft, salary: { hidden: false, min: 900, max: 100 } })).toEqual([]);
    expect(issuePaths({ ...draft, title: 'x'.repeat(151), location: 'Mars' })).toEqual(
      expect.arrayContaining(['title', 'location']),
    );
  });

  it('still enforces the notes limit', () => {
    expect(issuePaths({ ...draft, notes: Array(6).fill('x') })).toEqual(['notes']);
  });
});

describe('isJobEditable / isJobDeletable', () => {
  it('lets drafts and rejected jobs be edited, and only drafts be deleted', () => {
    expect(isJobEditable('DRAFT')).toBe(true);
    expect(isJobEditable('REJECTED')).toBe(true);
    for (const status of ['PENDING', 'PUBLISHED', 'CLOSED'] as const) {
      expect(isJobEditable(status)).toBe(false);
    }
    expect(isJobDeletable('DRAFT')).toBe(true);
    for (const status of ['PENDING', 'PUBLISHED', 'CLOSED', 'REJECTED'] as const) {
      expect(isJobDeletable(status)).toBe(false);
    }
  });
});

describe('bulkDeleteJobsSchema', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  it('drops duplicate ids and rejects an empty list or a bad id', () => {
    expect(bulkDeleteJobsSchema.parse({ ids: [id, id] })).toEqual({ ids: [id] });
    expect(bulkDeleteJobsSchema.safeParse({ ids: [] }).success).toBe(false);
    expect(bulkDeleteJobsSchema.safeParse({ ids: ['x'] }).success).toBe(false);
  });
});

describe('recruiterJobListQuerySchema', () => {
  it('defaults to the first page of every status', () => {
    expect(recruiterJobListQuerySchema.parse({})).toEqual({
      page: 1,
      limit: RECRUITER_JOBS_PAGE_SIZE,
    });
  });

  it('coerces query strings and trims the search text', () => {
    expect(
      recruiterJobListQuerySchema.parse({ status: 'DRAFT', q: '  backend ', page: '3' }),
    ).toMatchObject({ status: 'DRAFT', q: 'backend', page: 3 });
  });

  it('rejects an unknown status, page 0 and an oversized page', () => {
    for (const query of [{ status: 'ALL' }, { page: '0' }, { limit: '51' }]) {
      expect(recruiterJobListQuerySchema.safeParse(query).success).toBe(false);
    }
  });
});

describe('recruiterJobListItemSchema', () => {
  const item = {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Thực tập sinh Backend',
    level: 'INTERN',
    location: 'Remote',
    status: 'PUBLISHED',
    moderationReason: null,
    updatedAt: '2026-11-13T00:00:00.000Z',
  };

  it('carries the applicant count of the job', () => {
    expect(recruiterJobListItemSchema.parse({ ...item, applicantCount: 4 }).applicantCount).toBe(4);
  });

  it('rejects a missing, negative or fractional applicantCount', () => {
    for (const applicantCount of [undefined, -1, 1.5, '3']) {
      expect(recruiterJobListItemSchema.safeParse({ ...item, applicantCount }).success).toBe(false);
    }
  });
});
