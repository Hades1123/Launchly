import {
  googleSignInResponseSchema,
  messageResponseSchema,
  sessionResponseSchema,
  userDtoSchema,
  type ForgotPasswordInput,
  type GoogleSignInInput,
  type LoginInput,
  type RegisterInput,
  type ResendVerificationInput,
  type ResetPasswordInput,
  type TokenRequestInput,
} from '@launchly/shared';
import { request, requestVoid } from '@/lib/api/http';

// Public endpoints use `auth: false`: they must not trigger a token refresh on 401.
const publicPost = { method: 'POST', auth: false } as const;

export function register(input: RegisterInput) {
  return request('/auth/register', messageResponseSchema, { ...publicPost, body: input });
}

export function verifyEmail(input: TokenRequestInput) {
  return request('/auth/verify-email', messageResponseSchema, { ...publicPost, body: input });
}

export function resendVerification(input: ResendVerificationInput) {
  return request('/auth/resend-verification', messageResponseSchema, {
    ...publicPost,
    body: input,
  });
}

export function login(input: LoginInput) {
  return request('/auth/login', sessionResponseSchema, { ...publicPost, body: input });
}

export function signInWithGoogle(input: GoogleSignInInput) {
  return request('/auth/google', googleSignInResponseSchema, { ...publicPost, body: input });
}

export function completeGoogleLink(input: TokenRequestInput) {
  return request('/auth/google/complete-link', sessionResponseSchema, {
    ...publicPost,
    body: input,
  });
}

export function forgotPassword(input: ForgotPasswordInput) {
  return request('/auth/forgot-password', messageResponseSchema, { ...publicPost, body: input });
}

export function resetPassword(input: ResetPasswordInput) {
  return requestVoid('/auth/reset-password', { ...publicPost, body: input });
}

export function getCurrentUser() {
  return request('/auth/me', userDtoSchema);
}

export function logout() {
  return requestVoid('/auth/logout', { method: 'POST' });
}

export { refreshAccessToken as refreshSession } from '@/lib/api/http';
