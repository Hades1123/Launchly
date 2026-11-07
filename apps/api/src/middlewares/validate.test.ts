import express from 'express';
import request from 'supertest';
import { loginSchema } from '@launchly/shared';
import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { validate } from '@/middlewares/validate';
import { errorHandler } from '@/middlewares/error-handler';

const app = express();
app.use(express.json());
app.post('/login', validate({ body: loginSchema }), (req, res) => res.json(req.body));
app.get(
  '/search',
  validate({ query: z.object({ page: z.coerce.number().int().min(1) }) }),
  (req, res) => res.json(req.query),
);
app.get('/items/:id', validate({ params: z.object({ id: z.uuid() }) }), (req, res) =>
  res.json(req.params),
);
app.use(errorHandler);

const firstPath = (res: { body: { error: { details: { path: unknown[] }[] } } }) =>
  res.body.error.details[0]?.path.slice(0, 2);

describe('validate()', () => {
  it.each([
    [() => request(app).post('/login').send({ email: 'x' }), ['body', 'email']],
    [() => request(app).get('/items/not-a-uuid'), ['params', 'id']],
  ])('rejects invalid input with a part-prefixed path', async (call, prefix) => {
    const res = await call();
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(firstPath(res)).toEqual(prefix);
  });

  it('strips unknown keys and coerces typed query values', async () => {
    const ok = await request(app)
      .post('/login')
      .send({ email: 'a@b.com', password: 'password1', role: 'ADMIN' });
    expect(ok.body).toEqual({ email: 'a@b.com', password: 'password1' });
    expect((await request(app).get('/search?page=abc')).status).toBe(400);
    expect((await request(app).get('/search?page=2')).body).toEqual({ page: 2 });
  });
});
