import { z } from 'zod';
import { JOB_LEVELS } from '../constants/job';

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
  salaryMin: z.number().nullable(),
  salaryMax: z.number().nullable(),
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
