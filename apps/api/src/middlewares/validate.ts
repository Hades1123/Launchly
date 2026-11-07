import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import type { ErrorDetail } from '@launchly/shared';
import { AppError, zodIssuesToDetails } from '@/lib/app-error';

export function validateBody<T>(schema: ZodType<T>): RequestHandler {
  return validate({ body: schema });
}

export function validate(schemas: {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}): RequestHandler {
  return (req, _res, next) => {
    const details: ErrorDetail[] = [];
    const parsed: Partial<Record<'body' | 'params' | 'query', unknown>> = {};
    for (const part of ['body', 'params', 'query'] as const) {
      const schema = schemas[part];
      if (!schema) continue;
      const result = schema.safeParse(req[part]);
      if (result.success) parsed[part] = result.data;
      else details.push(...zodIssuesToDetails(result.error.issues, [part]));
    }
    if (details.length > 0) {
      next(new AppError('VALIDATION_ERROR', 'Invalid request', details));
      return;
    }
    if ('body' in parsed) req.body = parsed.body;
    if ('params' in parsed) req.params = parsed.params as typeof req.params;
    if ('query' in parsed) {
      Object.defineProperty(req, 'query', {
        value: parsed.query,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }
    next();
  };
}
