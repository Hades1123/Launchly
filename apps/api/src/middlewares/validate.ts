import type { RequestHandler } from 'express';
import type { ErrorDetail } from '@launchly/shared';
import type { ZodType } from 'zod';
import { AppError, zodIssuesToDetails } from '@/lib/app-error';

type ValidationSchemas = {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
};

export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req, _res, next) => {
    const details: ErrorDetail[] = [];
    const parsed: Partial<Record<keyof ValidationSchemas, unknown>> = {};

    for (const part of ['body', 'params', 'query'] as const) {
      const schema = schemas[part];
      if (!schema) continue;
      const result = schema.safeParse(req[part]);
      if (result.success) {
        parsed[part] = result.data;
      } else {
        details.push(...zodIssuesToDetails(result.error.issues, [part]));
      }
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
