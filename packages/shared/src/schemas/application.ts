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

export const applicationIdParamsSchema = z.object({ id: z.uuid() });
export type ApplicationIdParams = z.infer<typeof applicationIdParamsSchema>;

/** One row of "My applications". `submittedAt` is when the candidate applied. */
export const candidateApplicationItemSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  jobTitle: z.string(),
  companyName: z.string(),
  status: applicationStatusSchema,
  currentStageName: z.string().nullable(),
  submittedAt: z.string(),
  updatedAt: z.string(),
});
export type CandidateApplicationItem = z.infer<typeof candidateApplicationItemSchema>;

export const candidateApplicationListSchema = z.object({
  data: z.array(candidateApplicationItemSchema),
});
export type CandidateApplicationList = z.infer<typeof candidateApplicationListSchema>;

/** One status change; `fromStatus` is null for the first row (SUBMITTED). */
export const applicationHistoryItemSchema = z.object({
  fromStatus: applicationStatusSchema.nullable(),
  toStatus: applicationStatusSchema,
  note: z.string().nullable(),
  changedAt: z.string(),
});
export type ApplicationHistoryItem = z.infer<typeof applicationHistoryItemSchema>;

export const applicationStageSchema = z.object({
  id: z.string(),
  name: z.string(),
  position: z.number().int(),
});
export type ApplicationStage = z.infer<typeof applicationStageSchema>;

/** The candidate's own application with its history (oldest first) and the job's stages. */
export const candidateApplicationDetailSchema = candidateApplicationItemSchema.extend({
  resumeId: z.string(),
  coverLetter: z.string().nullable(),
  history: z.array(applicationHistoryItemSchema),
  stages: z.array(applicationStageSchema),
});
export type CandidateApplicationDetail = z.infer<typeof candidateApplicationDetailSchema>;

/** Statuses a recruiter may set. SUBMITTED is the starting state and WITHDRAWN belongs to the candidate. */
export const RECRUITER_APPLICATION_STATUSES = [
  'SCREENING',
  'INTERVIEW',
  'OFFER',
  'ACCEPTED',
  'REJECTED',
] as const;
export const recruiterApplicationStatusSchema = z.enum(RECRUITER_APPLICATION_STATUSES);
export type RecruiterApplicationStatus = z.infer<typeof recruiterApplicationStatusSchema>;

export const MAX_STATUS_NOTE_LENGTH = 1000;

export const updateApplicationStatusSchema = z.object({
  status: recruiterApplicationStatusSchema,
  /** A stage of the application's own job. */
  stageId: z.uuid().optional(),
  note: z.string().trim().max(MAX_STATUS_NOTE_LENGTH).optional(),
});
export type UpdateApplicationStatusInput = z.infer<typeof updateApplicationStatusSchema>;

/** One applicant as the recruiter of the job sees them. */
export const recruiterApplicationSchema = z.object({
  id: z.string(),
  status: applicationStatusSchema,
  submittedAt: z.string(),
  candidate: z.object({
    name: z.string(),
    headline: z.string().nullable(),
    skills: z.array(z.string()),
  }),
  resume: z.object({ id: z.string(), fileName: z.string() }),
  currentStage: z.object({ id: z.string(), name: z.string() }).nullable(),
});
export type RecruiterApplication = z.infer<typeof recruiterApplicationSchema>;

export const recruiterApplicationListSchema = z.object({
  data: z.array(recruiterApplicationSchema),
});
export type RecruiterApplicationList = z.infer<typeof recruiterApplicationListSchema>;
