import { describe, expect, it } from 'vitest';
import { apiErrorSchema, errorCodeSchema } from './error';

describe('error contract', () => {
  it('parses a valid error body', () => {
    const body = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request',
        details: [{ path: ['body', 'email'], message: 'Invalid email' }],
      },
    };
    expect(apiErrorSchema.parse(body)).toEqual(body);
  });

  it('rejects an unknown error code', () => {
    expect(() => errorCodeSchema.parse('TEAPOT')).toThrow();
    expect(() => apiErrorSchema.parse({ error: { code: 'TEAPOT', message: 'x' } })).toThrow();
  });

  it('treats details as optional', () => {
    const body = { error: { code: 'NOT_FOUND', message: 'Route not found' } };
    const parsed = apiErrorSchema.parse(body);
    expect(parsed.error.details).toBeUndefined();
  });
});
