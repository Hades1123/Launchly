import { z } from 'zod';

export const ROUND_FORMATS = ['ONLINE', 'ONSITE', 'PHONE', 'ASSIGNMENT'] as const;
export const roundFormatSchema = z.enum(ROUND_FORMATS);
export type RoundFormat = z.infer<typeof roundFormatSchema>;

export const MAX_ROUNDS = 10;
export const MIN_ROUND_DURATION_MINUTES = 5;
export const MAX_ROUND_DURATION_MINUTES = 480;

/** One round as submitted. Order is the array order; the server assigns `position`. */
export const roundInputSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, 'Round name is required').max(100),
  format: roundFormatSchema,
  estimatedDurationMinutes: z
    .number()
    .int()
    .min(MIN_ROUND_DURATION_MINUTES)
    .max(MAX_ROUND_DURATION_MINUTES),
});
export type RoundInput = z.infer<typeof roundInputSchema>;

export const replaceRoundsSchema = z.object({
  rounds: z.array(roundInputSchema).max(MAX_ROUNDS),
});
export type ReplaceRoundsInput = z.infer<typeof replaceRoundsSchema>;

export const jobIdParamsSchema = z.object({ id: z.uuid() });

export const roundDtoSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  format: roundFormatSchema.nullable(),
  estimatedDurationMinutes: z.number().int().nullable(),
  position: z.number().int().positive(),
});
export type RoundDto = z.infer<typeof roundDtoSchema>;

export const roundsResponseSchema = z.object({ rounds: z.array(roundDtoSchema) });
export type RoundsResponse = z.infer<typeof roundsResponseSchema>;
