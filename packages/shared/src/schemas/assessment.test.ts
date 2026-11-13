import { describe, expect, it } from 'vitest';
import { assessmentResultSchema, createAssessmentSchema } from './assessment';

const resumeId = '22222222-2222-4222-8222-222222222222';
const jobId = '11111111-1111-4111-8111-111111111111';

const result = {
  score: 72,
  matched: [{ category: 'skill', point: 'React' }],
  missing: [{ skill: 'GraphQL', importance: 'nice_to_have' }],
  suggestions: ['Add metrics', 'Link projects', 'Mention testing'],
  evidence: ['Built a React dashboard'],
};

describe('assessmentResultSchema', () => {
  it('accepts a complete result', () => {
    expect(assessmentResultSchema.safeParse(result).success).toBe(true);
  });

  it('enforces the score range, at least 3 suggestions and the skill tags', () => {
    expect(assessmentResultSchema.safeParse({ ...result, score: 101 }).success).toBe(false);
    expect(assessmentResultSchema.safeParse({ ...result, score: -1 }).success).toBe(false);
    expect(assessmentResultSchema.safeParse({ ...result, suggestions: ['a', 'b'] }).success).toBe(
      false,
    );
    expect(
      assessmentResultSchema.safeParse({
        ...result,
        missing: [{ skill: 'GraphQL', importance: 'maybe' }],
      }).success,
    ).toBe(false);
    expect(
      assessmentResultSchema.safeParse({
        ...result,
        matched: [{ category: 'hobby', point: 'Chess' }],
      }).success,
    ).toBe(false);
  });
});

describe('createAssessmentSchema', () => {
  it('needs exactly one of jobId and jobDescription', () => {
    expect(createAssessmentSchema.safeParse({ resumeId, jobId }).success).toBe(true);
    expect(createAssessmentSchema.safeParse({ resumeId, jobDescription: 'We hire.' }).success).toBe(
      true,
    );
    expect(createAssessmentSchema.safeParse({ resumeId }).success).toBe(false);
    expect(
      createAssessmentSchema.safeParse({ resumeId, jobId, jobDescription: 'We hire.' }).success,
    ).toBe(false);
  });

  it('rejects non-uuid ids and an empty or oversized description', () => {
    expect(createAssessmentSchema.safeParse({ resumeId: 'x', jobId }).success).toBe(false);
    expect(createAssessmentSchema.safeParse({ resumeId, jobDescription: '   ' }).success).toBe(
      false,
    );
    expect(
      createAssessmentSchema.safeParse({ resumeId, jobDescription: 'x'.repeat(10001) }).success,
    ).toBe(false);
  });
});
