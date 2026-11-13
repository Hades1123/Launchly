import { z } from 'zod';
import { companyModerationStatusSchema } from './company';

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
