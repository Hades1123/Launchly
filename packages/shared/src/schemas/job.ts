import { z } from 'zod';
import { JOB_LEVELS } from '../constants/job';
import { publicSalarySchema } from './job-salary';
import { roundFormatSchema } from './job-round';

export const jobLevelSchema = z.enum(JOB_LEVELS);

export const jobFilterQuerySchema = z.object({
  keyword: z.string().trim().optional(),
  industry: z.string().trim().optional(),
  level: jobLevelSchema.optional(),
  location: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});
export type JobFilterQuery = z.infer<typeof jobFilterQuerySchema>;

export const publicCompanySummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  website: z.string().nullable(),
});
export type PublicCompanySummary = z.infer<typeof publicCompanySummarySchema>;

export const publicJobItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  level: jobLevelSchema,
  location: z.string(),
  industry: z.string().nullable(),
  requirements: z.array(z.string()),
  benefits: z.array(z.string()),
  salary: publicSalarySchema,
  createdAt: z.string(),
  company: publicCompanySummarySchema,
});
export type PublicJobItem = z.infer<typeof publicJobItemSchema>;

export const publicJobListResponseSchema = z.object({
  data: z.array(publicJobItemSchema),
  pagination: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
});
export type PublicJobListResponse = z.infer<typeof publicJobListResponseSchema>;

export const jobIdParamsSchema = z.object({ id: z.string().uuid() });
export type JobIdParams = z.infer<typeof jobIdParamsSchema>;

/** One hiring round as candidates see it. Format and duration are null until the recruiter sets them. */
export const publicJobStageSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  position: z.number().int(),
  format: roundFormatSchema.nullable(),
  estimatedDurationMinutes: z.number().int().nullable(),
});
export type PublicJobStage = z.infer<typeof publicJobStageSchema>;

/** A note the company left for applicants. */
export const publicJobNoteSchema = z.object({
  id: z.string(),
  content: z.string(),
  position: z.number().int(),
});
export type PublicJobNote = z.infer<typeof publicJobNoteSchema>;

export const publicJobDetailSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  level: jobLevelSchema,
  location: z.string(),
  company: z.object({ id: z.string(), name: z.string() }),
  salary: publicSalarySchema,
  stages: z.array(publicJobStageSchema),
  notes: z.array(publicJobNoteSchema),
});
export type PublicJobDetail = z.infer<typeof publicJobDetailSchema>;
