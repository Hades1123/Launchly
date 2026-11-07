import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { HttpError } from '@/lib/http-error';
import { authenticate } from '@/middlewares/authenticate';
import { authorize } from '@/middlewares/authorize';
import { errorHandler } from '@/middlewares/error-handler';
import type { createAuthService } from '@/modules/auth/auth.service';

function makeApp(role: 'CANDIDATE' | 'RECRUITER' | 'ADMIN') {
  const service = {
    verifyAccessToken: vi.fn(() => ({ userId: 'user-id', sessionId: 'session-id' })),
    getSessionUser: vi.fn(async () => ({
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'user@example.com',
      fullName: null,
      role,
      emailVerified: true,
    })),
  } as unknown as ReturnType<typeof createAuthService>;
  const app = express();
  app.get(
    '/admin',
    authenticate(service),
    authorize('ADMIN'),
    (_req, res) => res.json({ secret: 'admin-only' }),
  );
  app.use(errorHandler);
  return app;
}

describe('role authorization middleware', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await request(makeApp('ADMIN')).get('/admin');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
    expect(response.body.secret).toBeUndefined();
  });

  it('denies users with a different role without returning protected content', async () => {
    const response = await request(makeApp('CANDIDATE'))
      .get('/admin')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
    expect(response.body.secret).toBeUndefined();
  });

  it('allows the configured role', async () => {
    const response = await request(makeApp('ADMIN'))
      .get('/admin')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body.secret).toBe('admin-only');
  });

  it('normalizes invalid bearer tokens to an unauthenticated response', async () => {
    const app = express();
    const service = {
      verifyAccessToken: vi.fn(() => {
        throw new HttpError(401, 'INVALID_SESSION', 'Session is invalid or expired');
      }),
      getSessionUser: vi.fn(),
    } as unknown as ReturnType<typeof createAuthService>;
    app.get('/admin', authenticate(service), authorize('ADMIN'), (_req, res) => {
      res.json({ secret: 'admin-only' });
    });
    app.use(errorHandler);

    const response = await request(app)
      .get('/admin')
      .set('Authorization', 'Bearer invalid-token');

    expect(response.status).toBe(401);
    expect(response.body.secret).toBeUndefined();
  });

  it('does not misreport session-store failures as invalid credentials', async () => {
    const app = express();
    const service = {
      verifyAccessToken: vi.fn(() => ({ userId: 'user-id', sessionId: 'session-id' })),
      getSessionUser: vi.fn(async () => {
        throw new Error('Database unavailable');
      }),
    } as unknown as ReturnType<typeof createAuthService>;
    app.get('/admin', authenticate(service), authorize('ADMIN'), (_req, res) => {
      res.json({ secret: 'admin-only' });
    });
    app.use(errorHandler);

    const response = await request(app)
      .get('/admin')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
    expect(response.body.secret).toBeUndefined();
  });
});
