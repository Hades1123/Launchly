import { z } from 'zod';
import { userRoleSchema } from './common';

export const registrationRoleSchema = z.enum(['CANDIDATE', 'RECRUITER']);

const emailSchema = z
  .string()
  .trim()
  .pipe(z.email())
  .transform((email) => email.toLowerCase());
const passwordSchema = z.string().min(8).max(128);
const tokenSchema = z.string().min(32).max(512);

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  role: registrationRoleSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const tokenRequestSchema = z.object({ token: tokenSchema });
export type TokenRequestInput = z.infer<typeof tokenRequestSchema>;
export const resendVerificationSchema = z.object({ email: emailSchema });
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export const resetPasswordSchema = z.object({
  token: tokenSchema,
  password: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export const googleSignInSchema = z.object({
  idToken: z.string().min(1).max(8192),
  role: registrationRoleSchema.optional(),
});
export type GoogleSignInInput = z.infer<typeof googleSignInSchema>;

export const userDtoSchema = z.object({
  id: z.string().min(1),
  email: z.email(),
  fullName: z.string().nullable(),
  role: userRoleSchema,
  emailVerified: z.boolean(),
});
export type UserDto = z.infer<typeof userDtoSchema>;

export const authErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(z.unknown()).optional(),
  }),
});

export const messageResponseSchema = z.object({ message: z.string() });
export const sessionResponseSchema = z.object({
  accessToken: z.string(),
  tokenType: z.literal('Bearer'),
  expiresIn: z.number().int(),
  user: userDtoSchema,
});
export type SessionResponse = z.infer<typeof sessionResponseSchema>;

export const accessTokenResponseSchema = z.object({
  accessToken: z.string(),
  tokenType: z.literal('Bearer'),
  expiresIn: z.number().int(),
});

export const roleSelectionResponseSchema = z.object({
  requiresRoleSelection: z.literal(true),
  roles: z.array(registrationRoleSchema),
});

export const googleLinkPendingResponseSchema = z.object({
  requiresEmailVerification: z.literal(true),
  message: z.string(),
});

export const googleSignInResponseSchema = z.union([
  sessionResponseSchema,
  roleSelectionResponseSchema,
  googleLinkPendingResponseSchema,
]);
export type GoogleSignInResponse = z.infer<typeof googleSignInResponseSchema>;
