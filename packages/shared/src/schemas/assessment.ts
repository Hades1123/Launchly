import { z } from 'zod';

export const MAX_ASSESSMENT_JOB_DESCRIPTION_LENGTH = 10000;

/** Send exactly one of `jobId` (a public job) or `jobDescription` (pasted text). */
export const createAssessmentSchema = z
  .object({
    resumeId: z.uuid(),
    jobId: z.uuid().optional(),
    jobDescription: z.string().trim().min(1).max(MAX_ASSESSMENT_JOB_DESCRIPTION_LENGTH).optional(),
  })
  .refine((v) => (v.jobId === undefined) !== (v.jobDescription === undefined), {
    message: 'Send exactly one of jobId or jobDescription',
    path: ['jobId'],
  });
export type CreateAssessmentInput = z.infer<typeof createAssessmentSchema>;

export const MATCH_CATEGORIES = ['skill', 'project', 'education'] as const;
export const SKILL_IMPORTANCE = ['required', 'nice_to_have'] as const;
export const MIN_SUGGESTIONS = 3;

/** What the AI must return, and what is stored as `AiAssessment.result`. */
export const assessmentResultSchema = z.object({
  score: z.number().min(0).max(100),
  matched: z.array(z.object({ category: z.enum(MATCH_CATEGORIES), point: z.string().min(1) })),
  missing: z.array(z.object({ skill: z.string().min(1), importance: z.enum(SKILL_IMPORTANCE) })),
  suggestions: z.array(z.string().min(1)).min(MIN_SUGGESTIONS),
  /** Short quotes from the CV that support the score. */
  evidence: z.array(z.string().min(1)),
});
export type AssessmentResult = z.infer<typeof assessmentResultSchema>;

export const assessmentDtoSchema = z.object({
  id: z.string(),
  status: z.literal('COMPLETED'),
  resumeId: z.string(),
  jobId: z.string().nullable(),
  createdAt: z.string(),
  result: assessmentResultSchema,
});
export type AssessmentDto = z.infer<typeof assessmentDtoSchema>;
