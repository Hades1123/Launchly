import { z } from 'zod';

export const userRoleSchema = z.enum(['CANDIDATE', 'RECRUITER', 'ADMIN']);
export type UserRole = z.infer<typeof userRoleSchema>;

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  time: z.string(),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;
