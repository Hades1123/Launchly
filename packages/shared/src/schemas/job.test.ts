import { describe, expect, it } from 'vitest';
import {
  jobIdParamsSchema,
  publicJobDetailSchema,
  publicJobNoteSchema,
  publicJobStageSchema,
} from './job';

const base = {
  id: 'j1',
  title: 'T',
  description: 'D',
  level: 'FRESHER',
  location: 'Hanoi',
  company: { id: 'c1', name: 'Acme' },
  stages: [],
  notes: [],
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
      publicJobDetailSchema.safeParse({
        ...base,
        level: 'MID',
        salary: { negotiable: true, min: null, max: null },
      }).success,
    ).toBe(false);
  });

  it('params reject non-uuid', () => {
    expect(jobIdParamsSchema.safeParse({ id: 'not-a-uuid' }).success).toBe(false);
    expect(
      jobIdParamsSchema.safeParse({ id: '00000000-0000-4000-8000-000000000401' }).success,
    ).toBe(true);
  });

  it('stage and note schemas accept the public shape and reject unknown formats', () => {
    const stage = {
      id: 's1',
      name: 'Interview',
      description: null,
      position: 1,
      format: 'ONLINE',
      estimatedDurationMinutes: 45,
    };
    expect(publicJobStageSchema.safeParse(stage).success).toBe(true);
    expect(
      publicJobStageSchema.safeParse({ ...stage, format: null, estimatedDurationMinutes: null })
        .success,
    ).toBe(true);
    expect(publicJobStageSchema.safeParse({ ...stage, format: 'TELEPATHY' }).success).toBe(false);
    expect(
      publicJobNoteSchema.safeParse({ id: 'n1', content: 'Bring a laptop', position: 1 }).success,
    ).toBe(true);
  });

  it('detail carries stages and notes', () => {
    const detail = {
      ...base,
      salary: { negotiable: true, min: null, max: null },
      stages: [
        {
          id: 's1',
          name: 'Interview',
          description: null,
          position: 1,
          format: 'PHONE',
          estimatedDurationMinutes: 20,
        },
      ],
      notes: [{ id: 'n1', content: 'Be on time', position: 1 }],
    };
    expect(publicJobDetailSchema.safeParse(detail).success).toBe(true);
    expect(publicJobDetailSchema.safeParse({ ...detail, stages: undefined }).success).toBe(false);
  });
});
