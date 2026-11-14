import { ApiError } from '@/lib/api/http';
import type { useTranslations } from 'next-intl';
import type { UserRole } from '@launchly/shared';

/** Translator for the `errors` namespace: `useTranslations('errors')` in the calling component. */
export type ErrorTranslator = ReturnType<typeof useTranslations<'errors'>>;

/** User-facing text for a failed auth/account call, in the active language. */
export function authErrorMessage(error: unknown, t: ErrorTranslator): string {
  if (!(error instanceof ApiError)) return t('generic');
  switch (error.code) {
    case 'INVALID_CREDENTIALS':
    case 'EMAIL_NOT_VERIFIED':
    case 'ACCOUNT_LOCKED':
    case 'EMAIL_ALREADY_REGISTERED':
    case 'INVALID_OR_EXPIRED_TOKEN':
    case 'INVALID_GOOGLE_IDENTITY':
    case 'GOOGLE_SIGN_IN_UNAVAILABLE':
    case 'RATE_LIMITED':
    case 'EMAIL_DELIVERY_FAILED':
    case 'VALIDATION_ERROR':
      return t(error.code);
    case 'ACCOUNT_ALREADY_REGISTERED':
      return t('EMAIL_ALREADY_REGISTERED');
    case 'UNAUTHENTICATED':
    case 'INVALID_SESSION':
      return t('SESSION_EXPIRED');
    default:
      return error.message || t('generic');
  }
}

export function fieldErrorMessage(
  error: ApiError,
  field: string,
  t: ErrorTranslator,
): string | undefined {
  const detail = error.details?.find((item) => item.path[0] === field);
  if (!detail) return undefined;
  if (field === 'email') return t('fields.email');
  if (field === 'password') return t('fields.password');
  return detail.message;
}

export function safeReturnPath(value: string | null | undefined, fallback = '/jobs'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return fallback;
  }
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

/** Where each role lands after signing in when no return path applies. */
const HOME_PATHS: Record<UserRole, string> = {
  CANDIDATE: '/jobs',
  RECRUITER: '/recruiter/jobs',
  ADMIN: '/admin/moderation',
};

/** Recruiters and admins only return to pages inside their own area. */
const ROLE_AREAS: Partial<Record<UserRole, string>> = {
  RECRUITER: '/recruiter',
  ADMIN: '/admin',
};

/**
 * Page to open after sign-in: the safe `next` path, or the role's home. A recruiter or admin is
 * sent to their own area instead of a candidate page.
 */
export function postLoginPath(role: UserRole, returnTo?: string | null): string {
  const home = HOME_PATHS[role];
  const path = safeReturnPath(returnTo, home);
  const area = ROLE_AREAS[role];
  if (area && path !== area && !path.startsWith(`${area}/`) && !path.startsWith(`${area}?`)) {
    return home;
  }
  return path;
}

type NamedUser = { fullName: string | null; email: string; role: UserRole };

export function userDisplayName(user: NamedUser): string {
  return user.fullName?.trim() || user.email;
}

/** Up to two initials for the avatar bubble. */
export function userInitials(user: NamedUser): string {
  return (
    userDisplayName(user)
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?'
  );
}
