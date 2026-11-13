import { describe, expect, it } from 'vitest';
import {
  generatedPracticeQuestionsSchema,
  practiceAnswerInputSchema,
  practiceHistoryQuerySchema,
  practiceHistoryResponseSchema,
  practiceSessionDtoSchema,
  startPracticeSchema,
} from './interview-practice';

const JOB = '11111111-1111-4111-8111-111111111111';
const STAGE = '22222222-2222-4222-8222-222222222222';

describe('startPracticeSchema', () => {
  it('requires consent true and a uuid jobId', () => {
    expect(startPracticeSchema.safeParse({ jobId: JOB, consent: true }).success).toBe(true);
    expect(startPracticeSchema.safeParse({ jobId: JOB, consent: false }).success).toBe(false);
    expect(startPracticeSchema.safeParse({ jobId: JOB }).success).toBe(false);
    expect(startPracticeSchema.safeParse({ jobId: 'nope', consent: true }).success).toBe(false);
  });

  it('accepts an optional stageId and rejects a non-uuid one', () => {
    expect(startPracticeSchema.parse({ jobId: JOB, consent: true, stageId: STAGE }).stageId).toBe(
      STAGE,
    );
    expect(startPracticeSchema.safeParse({ jobId: JOB, consent: true, stageId: 'x' }).success).toBe(
      false,
    );
  });
});

describe('practiceHistoryQuerySchema', () => {
  it('defaults to page 1 limit 10 and rejects a limit above 50', () => {
    expect(practiceHistoryQuerySchema.parse({})).toEqual({ page: 1, limit: 10 });
    expect(practiceHistoryQuerySchema.parse({ page: '3', limit: '50' })).toEqual({
      page: 3,
      limit: 50,
    });
    expect(practiceHistoryQuerySchema.safeParse({ limit: '51' }).success).toBe(false);
    expect(practiceHistoryQuerySchema.safeParse({ page: '0' }).success).toBe(false);
  });
});

describe('response schemas', () => {
  it('describes a session with rounds, questions and answers', () => {
    const session = {
      id: JOB,
      jobId: JOB,
      jobTitle: 'Frontend Intern',
      applicationId: null,
      scope: 'FULL',
      status: 'IN_PROGRESS',
      interviewConsentAt: '2026-11-13T10:00:00.000Z',
      lastActivityAt: '2026-11-13T10:00:00.000Z',
      expiresAt: '2026-11-14T10:00:00.000Z',
      summary: null,
      createdAt: '2026-11-13T10:00:00.000Z',
      rounds: [
        {
          id: STAGE,
          stageId: STAGE,
          name: 'Phone screen',
          position: 1,
          status: 'IN_PROGRESS',
          feedback: null,
          questions: [
            {
              id: JOB,
              position: 1,
              prompt: 'Tell me about a project',
              source: 'JOB_DESCRIPTION',
              answer: { answer: 'A table', feedback: null, score: null },
            },
          ],
        },
      ],
    };
    expect(practiceSessionDtoSchema.safeParse(session).success).toBe(true);
  });

  it('history items carry no answer bodies', () => {
    const response = {
      data: [
        {
          id: JOB,
          jobId: JOB,
          jobTitle: 'Frontend Intern',
          scope: 'FULL',
          status: 'COMPLETED',
          roundCount: 2,
          createdAt: '2026-11-13T10:00:00.000Z',
          completedAt: null,
        },
      ],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    };
    const parsed = practiceHistoryResponseSchema.parse({
      ...response,
      data: [{ ...response.data[0], answers: ['secret'], rounds: [] }],
    });
    expect(parsed.data[0]).not.toHaveProperty('answers');
    expect(parsed.data[0]).not.toHaveProperty('rounds');
  });
});

describe('generatedPracticeQuestionsSchema', () => {
  const question = (source = 'JOB_DESCRIPTION') => ({ prompt: 'Describe a project', source });
  const five = Array.from({ length: 5 }, () => question());

  it('requires exactly five questions with a known source label', () => {
    expect(generatedPracticeQuestionsSchema.safeParse({ questions: five }).success).toBe(true);
    expect(
      generatedPracticeQuestionsSchema.safeParse({ questions: five.slice(0, 4) }).success,
    ).toBe(false);
    expect(
      generatedPracticeQuestionsSchema.safeParse({ questions: [...five, question()] }).success,
    ).toBe(false);
    expect(
      generatedPracticeQuestionsSchema.safeParse({
        questions: [...five.slice(0, 4), question('CV')],
      }).success,
    ).toBe(false);
  });

  it('rejects a blank question', () => {
    const blank = [...five.slice(0, 4), { prompt: '  ', source: 'ROUND_PROCESS' }];
    expect(generatedPracticeQuestionsSchema.safeParse({ questions: blank }).success).toBe(false);
  });
});

describe('practiceAnswerInputSchema', () => {
  it('trims the answer and rejects a blank or oversized one', () => {
    expect(practiceAnswerInputSchema.parse({ answer: '  hello ' }).answer).toBe('hello');
    expect(practiceAnswerInputSchema.safeParse({ answer: '   ' }).success).toBe(false);
    expect(practiceAnswerInputSchema.safeParse({ answer: 'x'.repeat(5001) }).success).toBe(false);
  });
});
