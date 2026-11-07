import type { ErrorCode, ErrorDetail } from '@launchly/shared';
import type { ZodIssue } from 'zod';

export const errorStatus: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  RATE_LIMITED: 429,
  UNAUTHENTICATED: 401,
  INVALID_SESSION: 401,
  INVALID_CREDENTIALS: 401,
  EMAIL_NOT_VERIFIED: 403,
  ACCOUNT_LOCKED: 403,
  EMAIL_ALREADY_REGISTERED: 409,
  ACCOUNT_ALREADY_REGISTERED: 409,
  INVALID_GOOGLE_IDENTITY: 401,
  GOOGLE_SIGN_IN_UNAVAILABLE: 503,
  INVALID_OR_EXPIRED_TOKEN: 400,
  EMAIL_DELIVERY_FAILED: 503,
  INTERNAL_ERROR: 500,
};

export class AppError extends Error {
  readonly status: number;

  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: ErrorDetail[],
  ) {
    super(message);
    this.name = 'AppError';
    this.status = errorStatus[code];
  }
}

export function zodIssuesToDetails(
  issues: ZodIssue[],
  prefix: (string | number)[] = [],
): ErrorDetail[] {
  return issues.map((issue) => ({
    path: [...prefix, ...issue.path.map((key) => (typeof key === 'number' ? key : String(key)))],
    message: issue.message,
  }));
}
