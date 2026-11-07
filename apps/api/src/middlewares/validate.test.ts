import express from 'express';
import request from 'supertest';
import { loginSchema } from '@launchly/shared';
import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { validate } from '@/middlewares/validate';
import { errorHandler } from '@/middlewares/error-handler';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.post('/login', validate({ body: loginSchema }), (req, res) => {
    res.json(req.body);
  });
  app.get(
    '/search',
    validate({ query: z.object({ page: z.coerce.number().int().min(1) }) }),
    (req, res) => {
      const page = (req.query as { page: number }).page;
      res.json({ page, type: typeof page });
    },
  );
  app.get('/items/:id', validate({ params: z.object({ id: z.uuid() }) }), (req, res) => {
    res.json(req.params);
  });
  app.use(errorHandler);
  return app;
}

describe('validate()', () => {
  it('rejects an invalid body with a body-prefixed path', async () => {
    const res = await request(buildApp()).post('/login').send({ email: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.some((d: { path: unknown[] }) => d.path[0] === 'body')).toBe(
      true,
    );
    expect(
      res.body.error.details.some(
        (d: { path: unknown[] }) => d.path[0] === 'body' && d.path[1] === 'email',
      ),
    ).toBe(true);
  });

  it('strips unknown keys from a valid body', async () => {
    const res = await request(buildApp())
      .post('/login')
      .send({ email: 'a@b.com', password: 'password1', role: 'ADMIN' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ email: 'a@b.com', password: 'password1' });
    expect(res.body.role).toBeUndefined();
  });

  it('rejects a non-coercible query value', async () => {
    const res = await request(buildApp()).get('/search?page=abc');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('coerces and types a valid query value', async () => {
    const res = await request(buildApp()).get('/search?page=2');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ page: 2, type: 'number' });
  });

  it('rejects an invalid param with a params-prefixed path', async () => {
    const res = await request(buildApp()).get('/items/not-a-uuid');
    expect(res.status).toBe(400);
    expect(res.body.error.details.some((d: { path: unknown[] }) => d.path[0] === 'params')).toBe(
      true,
    );
    expect(
      res.body.error.details.some(
        (d: { path: unknown[] }) => d.path[0] === 'params' && d.path[1] === 'id',
      ),
    ).toBe(true);
  });
});
