import { z } from 'zod';

export const companyModerationStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED']);
export type CompanyModerationStatus = z.infer<typeof companyModerationStatusSchema>;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));

export const createCompanySchema = z.object({
  name: z.string().trim().min(1).max(200),
  address: z.string().trim().min(1).max(300),
  industry: optionalText(100),
  companySize: optionalText(50),
  website: optionalText(300),
  logoUrl: optionalText(500),
  description: optionalText(5000),
});
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;

export const companyIdParamsSchema = z.object({ id: z.uuid() });

export const companyDtoSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  address: z.string().nullable(),
  industry: z.string().nullable(),
  companySize: z.string().nullable(),
  website: z.string().nullable(),
  logoUrl: z.string().nullable(),
  description: z.string().nullable(),
  moderationStatus: companyModerationStatusSchema,
  createdAt: z.string(),
});
export type CompanyDto = z.infer<typeof companyDtoSchema>;
