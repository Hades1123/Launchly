import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  void next;
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'VALIDATION_ERROR', issues: err.issues });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'INTERNAL_ERROR' });
};
