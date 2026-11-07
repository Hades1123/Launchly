import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '@/lib/http-error';

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  void next;
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.issues.map(({ code, path, message }) => ({
          code,
          path,
          message,
        })),
      },
    });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message },
    });
    return;
  }
  console.error(err);
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
  });
};
