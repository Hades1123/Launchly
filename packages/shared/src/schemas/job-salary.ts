import { z } from 'zod';

/**
 * Salary as shown in candidate-facing (public) job data. When the recruiter
 * hides the salary, `negotiable` is true and `min`/`max` are always null, so
 * the real figures never leave the API. Clients render "Negotiable".
 */
export const publicSalarySchema = z.object({
  negotiable: z.boolean(),
  min: z.number().nullable(),
  max: z.number().nullable(),
});

export type PublicSalary = z.infer<typeof publicSalarySchema>;
