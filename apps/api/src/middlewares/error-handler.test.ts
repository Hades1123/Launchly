import express from 'express';
import request from 'supertest';
import { apiErrorSchema, loginSchema } from '@launchly/shared';
import { describe, expect, it } from 'vitest';
import { AppError } from '@/lib/app-error';
import { HttpError } from '@/lib/http-error';
import { errorHandler } from '@/middlewares/error-handler';

const app = express();
app.use(express.json());
app.get('/conflict', async () => {
  throw new AppError('CONFLICT', 'Email already registered');
});
app.get('/invalid-credentials', async () => {
  throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
});
app.get('/email-delivery-failed', async () => {
  throw new HttpError(503, 'EMAIL_DELIVERY_FAILED', 'Email delivery is unavailable');
});
app.get('/zod', async () => loginSchema.parse({}));
app.get('/boom', async () => {
  throw new Error('db password=secret');
});
app.use(errorHandler);

describe('error handler', () => {
  it.each([
    ['/conflict', 409, { code: 'CONFLICT', message: 'Email already registered' }],
    [
      '/invalid-credentials',
      401,
      { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect' },
    ],
    [
      '/email-delivery-failed',
      503,
      { code: 'EMAIL_DELIVERY_FAILED', message: 'Email delivery is unavailable' },
    ],
    ['/boom', 500, { code: 'INTERNAL_ERROR', message: 'Internal server error' }],
  ])('maps %s to its contract body without leaking internals', async (path, status, error) => {
    const res = await request(app).get(path);
    expect(res.status).toBe(status);
    expect(res.body).toEqual({ error });
    expect(res.text).not.toContain('secret');
    expect(() => apiErrorSchema.parse(res.body)).not.toThrow();
  });

  it('maps a ZodError to 400 VALIDATION_ERROR with field details', async () => {
    const res = await request(app).get('/zod');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.flatMap((d: { path: unknown[] }) => d.path)).toContain('email');
  });
});
