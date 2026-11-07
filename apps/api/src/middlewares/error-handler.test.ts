import express from 'express';
import request from 'supertest';
import { apiErrorSchema, loginSchema } from '@launchly/shared';
import { describe, expect, it } from 'vitest';
import { AppError } from '@/lib/app-error';
import { errorHandler } from '@/middlewares/error-handler';

const app = express();
app.use(express.json());
app.get('/conflict', async () => {
  throw new AppError('CONFLICT', 'Email already registered');
});
app.get('/zod', async () => loginSchema.parse({}));
app.get('/boom', async () => {
  throw new Error('db password=secret');
});
app.use(errorHandler);

describe('error handler', () => {
  it.each([
    ['/conflict', 409, { code: 'CONFLICT', message: 'Email already registered' }],
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
