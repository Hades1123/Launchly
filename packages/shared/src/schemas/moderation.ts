import { z } from 'zod';
import { companyModerationStatusSchema } from './company';
import { recruiterJobSchema } from './job-posting';

export const MAX_MODERATION_REASON = 1000;

/** Body of an admin rejection; the reason is sent to the recruiter. */
export const moderationRejectSchema = z.object({
  reason: z.string().trim().min(1).max(MAX_MODERATION_REASON),
});
export type ModerationRejectInput = z.infer<typeof moderationRejectSchema>;

export const adminCompanyListQuerySchema = z.object({
  status: companyModerationStatusSchema.default('PENDING'),
});
export type AdminCompanyListQuery = z.infer<typeof adminCompanyListQuerySchema>;

/** A company as an admin sees it: the public fields plus moderation and owner contact data. */
export const adminCompanySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  address: z.string().nullable(),
  industry: z.string().nullable(),
  companySize: z.string().nullable(),
  website: z.string().nullable(),
  logoUrl: z.string().nullable(),
  description: z.string().nullable(),
  moderationStatus: companyModerationStatusSchema,
  moderationReason: z.string().nullable(),
  ownerEmail: z.string(),
  reviewedAt: z.string().nullable(),
  createdAt: z.string(),
});
export type AdminCompany = z.infer<typeof adminCompanySchema>;

/** Job statuses an admin reviews or looks back on; drafts and closed jobs are not theirs. */
export const adminJobListQuerySchema = z.object({
  status: z.enum(['PENDING', 'PUBLISHED', 'REJECTED']).default('PENDING'),
});
export type AdminJobListQuery = z.infer<typeof adminJobListQuerySchema>;

/** A job as an admin sees it: everything the recruiter sees, plus who posted it and when it was reviewed. */
export const adminJobSchema = recruiterJobSchema.extend({
  companyName: z.string(),
  creatorEmail: z.string(),
  reviewedAt: z.string().nullable(),
});
export type AdminJob = z.infer<typeof adminJobSchema>;
