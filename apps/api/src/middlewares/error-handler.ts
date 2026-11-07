import type { ErrorRequestHandler } from 'express';
import type { ApiError, ErrorCode, ErrorDetail } from '@launchly/shared';
import { ZodError } from 'zod';
import { AppError, zodIssuesToDetails } from '@/lib/app-error';

const fail = (code: ErrorCode, message: string, details?: ErrorDetail[]): ApiError => ({
  error: { code, message, ...(details ? { details } : {}) },
});

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  const type = (err as { type?: string })?.type;
  let status = 500;
  let out = fail('INTERNAL_ERROR', 'Internal server error');
  if (err instanceof AppError && (err.status < 500 || err.status === 503)) {
    status = err.status;
    out = fail(err.code, err.message, err.details);
  } else if (err instanceof ZodError) {
    status = 400;
    out = fail('VALIDATION_ERROR', 'Invalid request', zodIssuesToDetails(err.issues));
  } else if (type === 'entity.parse.failed') {
    status = 400;
    out = fail('VALIDATION_ERROR', 'Malformed JSON body');
  } else if (type === 'entity.too.large') {
    status = 413;
    out = fail('PAYLOAD_TOO_LARGE', 'Request body too large');
  } else {
    console.error(err);
  }
  res.status(status).json(out);
};
