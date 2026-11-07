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
  INTERNAL_ERROR: 500,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: ErrorDetail[];

  constructor(code: ErrorCode, message: string, details?: ErrorDetail[]) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = errorStatus[code];
    this.details = details;
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
