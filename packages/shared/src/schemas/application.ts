import { z } from 'zod';

export const APPLICATION_STATUSES = [
  'SUBMITTED',
  'SCREENING',
  'INTERVIEW',
  'OFFER',
  'ACCEPTED',
  'REJECTED',
  'WITHDRAWN',
] as const;
export const applicationStatusSchema = z.enum(APPLICATION_STATUSES);
export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;

export const MAX_COVER_LETTER_LENGTH = 2000;

/** A candidate applies to one job with one of their own CVs. */
export const createApplicationSchema = z.object({
  jobId: z.uuid(),
  resumeId: z.uuid(),
  coverLetter: z.string().trim().max(MAX_COVER_LETTER_LENGTH).optional(),
});
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;

export const applicationDtoSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  resumeId: z.string(),
  status: applicationStatusSchema,
  coverLetter: z.string().nullable(),
  currentStageId: z.string().nullable(),
  createdAt: z.string(),
});
export type ApplicationDto = z.infer<typeof applicationDtoSchema>;
