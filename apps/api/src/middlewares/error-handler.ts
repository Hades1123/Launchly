import type { ErrorRequestHandler } from 'express';
import type { ApiError } from '@launchly/shared';
import { ZodError } from 'zod';
import { AppError, zodIssuesToDetails } from '@/lib/app-error';

type BodyParserError = { type?: string };

function send(res: Parameters<ErrorRequestHandler>[2], status: number, body: ApiError) {
  res.status(status).json(body);
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof AppError && err.status < 500) {
    send(res, err.status, {
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    send(res, 400, {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request',
        details: zodIssuesToDetails(err.issues),
      },
    });
    return;
  }

  const type = (err as BodyParserError)?.type;
  if (type === 'entity.parse.failed') {
    send(res, 400, { error: { code: 'VALIDATION_ERROR', message: 'Malformed JSON body' } });
    return;
  }
  if (type === 'entity.too.large') {
    send(res, 413, { error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large' } });
    return;
  }

  console.error(err);
  send(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
};
