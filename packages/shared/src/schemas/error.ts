import { z } from 'zod';

export const errorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'PAYLOAD_TOO_LARGE',
  'RATE_LIMITED',
  'UNAUTHENTICATED',
  'INVALID_SESSION',
  'INVALID_CREDENTIALS',
  'EMAIL_NOT_VERIFIED',
  'ACCOUNT_LOCKED',
  'EMAIL_ALREADY_REGISTERED',
  'ACCOUNT_ALREADY_REGISTERED',
  'INVALID_GOOGLE_IDENTITY',
  'GOOGLE_SIGN_IN_UNAVAILABLE',
  'INVALID_OR_EXPIRED_TOKEN',
  'EMAIL_DELIVERY_FAILED',
  'INTERNAL_ERROR',
]);
export type ErrorCode = z.infer<typeof errorCodeSchema>;

export const errorDetailSchema = z.object({
  path: z.array(z.union([z.string(), z.number()])),
  message: z.string(),
});
export type ErrorDetail = z.infer<typeof errorDetailSchema>;

export const apiErrorSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    details: z.array(errorDetailSchema).optional(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;
