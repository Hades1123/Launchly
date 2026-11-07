import { describe, expect, it } from 'vitest';
import { apiErrorSchema, errorCodeSchema } from './error';

describe('error contract', () => {
  it('parses a valid body, keeps details optional, and rejects unknown codes', () => {
    const full = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request',
        details: [{ path: ['body', 'email'], message: 'Invalid email' }],
      },
    };
    expect(apiErrorSchema.parse(full)).toEqual(full);
    const minimal = apiErrorSchema.parse({ error: { code: 'NOT_FOUND', message: 'x' } });
    expect(minimal.error.details).toBeUndefined();
    expect(() => errorCodeSchema.parse('TEAPOT')).toThrow();
  });
});
