import express from 'express';
import request from 'supertest';
import { apiErrorSchema, loginSchema } from '@launchly/shared';
import { describe, expect, it } from 'vitest';
import { AppError } from '@/lib/app-error';
import { errorHandler } from '@/middlewares/error-handler';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.get('/conflict', async () => {
    throw new AppError('CONFLICT', 'Email already registered');
  });
  app.get('/zod', async () => {
    loginSchema.parse({});
  });
  app.get('/boom', async () => {
    throw new Error('db password=secret');
  });
  app.use(errorHandler);
  return app;
}

describe('error handler', () => {
  it('maps a 4xx AppError to its status and contract body', async () => {
    const res = await request(buildApp()).get('/conflict');
    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      error: { code: 'CONFLICT', message: 'Email already registered' },
    });
    expect(() => apiErrorSchema.parse(res.body)).not.toThrow();
  });

  it('maps a ZodError to 400 VALIDATION_ERROR with details', async () => {
    const res = await request(buildApp()).get('/zod');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.some((d: { path: unknown[] }) => d.path.includes('email'))).toBe(
      true,
    );
    expect(() => apiErrorSchema.parse(res.body)).not.toThrow();
  });

  it('maps an unexpected error to a generic 500 that leaks nothing', async () => {
    const res = await request(buildApp()).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
    expect(res.text).not.toContain('secret');
    expect(res.body.error.stack).toBeUndefined();
    expect(() => apiErrorSchema.parse(res.body)).not.toThrow();
  });
});
