import { z } from 'zod';

export const practiceScopeSchema = z.enum(['FULL', 'ROUND']);
export type PracticeScope = z.infer<typeof practiceScopeSchema>;

export const practiceStatusSchema = z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']);
export type PracticeStatus = z.infer<typeof practiceStatusSchema>;

/** Start (or return) a practice session. `consent` is the interview AI consent, not the CV consent. */
export const startPracticeSchema = z.object({
  jobId: z.uuid(),
  consent: z.literal(true, { error: 'Interview AI consent is required to start practice' }),
  /** Practice only this round; omit to practice every interactive round of the job. */
  stageId: z.uuid().optional(),
});
export type StartPracticeInput = z.infer<typeof startPracticeSchema>;

export const practiceSessionIdParamsSchema = z.object({ id: z.uuid() });

export const practiceHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});
export type PracticeHistoryQuery = z.infer<typeof practiceHistoryQuerySchema>;

const practiceAnswerSchema = z.object({
  answer: z.string(),
  feedback: z.string().nullable(),
  score: z.number().nullable(),
});

export const practiceQuestionDtoSchema = z.object({
  id: z.uuid(),
  position: z.number().int().positive(),
  prompt: z.string(),
  source: z.string(),
  answer: practiceAnswerSchema.nullable(),
});

export const practiceRoundDtoSchema = z.object({
  id: z.uuid(),
  stageId: z.uuid().nullable(),
  name: z.string(),
  position: z.number().int().positive(),
  status: practiceStatusSchema,
  feedback: z.string().nullable(),
  questions: z.array(practiceQuestionDtoSchema),
});
export type PracticeRoundDto = z.infer<typeof practiceRoundDtoSchema>;

/** A practice session with its saved progress, for the owning candidate only. */
export const practiceSessionDtoSchema = z.object({
  id: z.uuid(),
  jobId: z.uuid(),
  jobTitle: z.string(),
  applicationId: z.uuid().nullable(),
  scope: practiceScopeSchema,
  status: practiceStatusSchema,
  interviewConsentAt: z.string().nullable(),
  lastActivityAt: z.string(),
  expiresAt: z.string().nullable(),
  summary: z.string().nullable(),
  createdAt: z.string(),
  rounds: z.array(practiceRoundDtoSchema),
});
export type PracticeSessionDto = z.infer<typeof practiceSessionDtoSchema>;

/** One history row: no questions or answer bodies. */
export const practiceHistoryItemSchema = z.object({
  id: z.uuid(),
  jobId: z.uuid(),
  jobTitle: z.string(),
  scope: practiceScopeSchema,
  status: practiceStatusSchema,
  roundCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
});
export type PracticeHistoryItem = z.infer<typeof practiceHistoryItemSchema>;

export const practiceHistoryResponseSchema = z.object({
  data: z.array(practiceHistoryItemSchema),
  pagination: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
});
export type PracticeHistoryResponse = z.infer<typeof practiceHistoryResponseSchema>;
