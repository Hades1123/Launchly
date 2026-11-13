import { describe, expect, it } from 'vitest';
import { MAX_JOB_NOTES, isJobEditable, saveJobSchema } from './job-posting';

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

  it('still needs the four columns the database keeps NOT NULL', () => {
    expect(issuePaths({ ...draft, title: '', description: '', level: '', location: '' })).toEqual(
      expect.arrayContaining(['title', 'description', 'level', 'location']),
    );
  });

  it('still enforces the notes limit', () => {
    expect(issuePaths({ ...draft, notes: Array(6).fill('x') })).toEqual(['notes']);
  });
});

describe('isJobEditable', () => {
  it('allows editing drafts only', () => {
    expect(isJobEditable('DRAFT')).toBe(true);
    for (const status of ['PENDING', 'PUBLISHED', 'CLOSED', 'REJECTED'] as const) {
      expect(isJobEditable(status)).toBe(false);
    }
  });
});
