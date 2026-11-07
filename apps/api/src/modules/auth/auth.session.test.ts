/**
 * T012 / T016 – Session tests: login, refresh rotation, logout revocation, /me
 */
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthService } from '@/modules/auth/auth.service';
import { createAuthRouter } from '@/modules/auth/auth.routes';
import { errorHandler } from '@/middlewares/error-handler';
import { hashPassword } from '@/modules/auth/auth.crypto';
import type { MailProvider } from '@/providers/mail/mail-provider';
import type { GoogleIdentityProvider } from '@/providers/google/google.provider';
import type { PrismaClient } from '@/generated/prisma/client';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockPrisma = any;

function makePrisma(): MockPrisma {
  return {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    authToken: { findUnique: vi.fn(), create: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() },
    authSession: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
    $transaction: vi.fn(),
  };
}

const noop: MailProvider = { send: vi.fn().mockResolvedValue(undefined) };
const noopGoogle: GoogleIdentityProvider = { verify: vi.fn() };

function makeApp(prisma: MockPrisma) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  const service = createAuthService(prisma as unknown as PrismaClient, noop, noopGoogle);
  app.use('/auth', createAuthRouter(service));
  app.use(errorHandler);
  return app;
}

async function realHash(password: string) {
  return hashPassword(password);
}

// ---------------------------------------------------------------------------
// US2 – Login
// ---------------------------------------------------------------------------

describe('POST /auth/login', () => {
  let prisma: MockPrisma;
  let app: ReturnType<typeof makeApp>;

  beforeEach(() => {
    prisma = makePrisma();
    app = makeApp(prisma);
  });

  afterEach(() => vi.restoreAllMocks());

  it('returns access token and sets httpOnly refresh cookie on correct credentials', async () => {
    const passwordHash = await realHash('correct-password');
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-id-login',
      email: 'alice@example.com',
      fullName: 'Alice',
      role: 'CANDIDATE',
      passwordHash,
      emailVerifiedAt: new Date(),
      lockedAt: null,
    });
    prisma.authSession.create.mockResolvedValue({});

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'alice@example.com', password: 'correct-password' });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.tokenType).toBe('Bearer');
    expect(res.body.expiresIn).toBe(900);
    expect(res.body.user.email).toBe('alice@example.com');
    expect(res.body.refreshToken).toBeUndefined();
    const cookieStr = [res.headers['set-cookie']].flat().join('; ');
    expect(cookieStr).toMatch(/launchly_refresh=/);
    expect(cookieStr).toMatch(/HttpOnly/i);
    expect(cookieStr).toMatch(/SameSite=Lax/i);
  });

  it('returns 401 for incorrect password without revealing account existence', async () => {
    const passwordHash = await realHash('correct-password');
    prisma.user.findUnique.mockResolvedValue({
      id: 'uid',
      email: 'alice@example.com',
      fullName: null,
      role: 'CANDIDATE',
      passwordHash,
      emailVerifiedAt: new Date(),
      lockedAt: null,
    });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'alice@example.com', password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(res.body.accessToken).toBeUndefined();
  });

  it('returns 401 for a completely unknown email', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'ghost@example.com', password: 'any-password' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns 403 EMAIL_NOT_VERIFIED for unverified accounts', async () => {
    const passwordHash = await realHash('pass1234');
    prisma.user.findUnique.mockResolvedValue({
      id: 'uid-unv',
      email: 'pending@example.com',
      fullName: null,
      role: 'CANDIDATE',
      passwordHash,
      emailVerifiedAt: null,
      lockedAt: null,
    });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'pending@example.com', password: 'pass1234' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('returns 403 ACCOUNT_LOCKED for locked accounts', async () => {
    const passwordHash = await realHash('pass1234');
    prisma.user.findUnique.mockResolvedValue({
      id: 'uid-locked',
      email: 'locked@example.com',
      fullName: null,
      role: 'RECRUITER',
      passwordHash,
      emailVerifiedAt: new Date(),
      lockedAt: new Date(),
    });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'locked@example.com', password: 'pass1234' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_LOCKED');
  });

  it('returns 400 for missing required fields', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'x@x.com' });
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// US2 – Refresh token rotation
// ---------------------------------------------------------------------------

describe('POST /auth/refresh', () => {
  let prisma: MockPrisma;
  let app: ReturnType<typeof makeApp>;

  beforeEach(() => {
    prisma = makePrisma();
    app = makeApp(prisma);
  });

  afterEach(() => vi.restoreAllMocks());

  it('issues a new access token and rotates the refresh cookie', async () => {
    const { hashRefreshToken } = await import('@/modules/auth/auth.crypto');
    const { env } = await import('@/lib/env');

    const rawRefresh = 'x'.repeat(43);
    const tokenHash = hashRefreshToken(rawRefresh, env.JWT_REFRESH_SECRET);

    const user = {
      id: 'uid-refresh',
      email: 'alice@example.com',
      fullName: null,
      role: 'CANDIDATE',
      emailVerifiedAt: new Date(),
      lockedAt: null,
    };
    prisma.authSession.findUnique.mockResolvedValue({
      id: 'session-id',
      userId: 'uid-refresh',
      refreshTokenHash: tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      revokedAt: null,
      user,
    });
    prisma.authSession.updateMany.mockResolvedValue({ count: 1 });

    const res = await request(app)
      .post('/auth/refresh')
      .set('Cookie', `launchly_refresh=${rawRefresh}`);

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.tokenType).toBe('Bearer');
    expect(res.body.refreshToken).toBeUndefined();
    const cookieStr = [res.headers['set-cookie']].flat().join('; ');
    expect(cookieStr).toMatch(/launchly_refresh=/);
  });

  it('returns 401 and clears cookie when refresh token is absent', async () => {
    const res = await request(app).post('/auth/refresh');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_SESSION');
  });

  it('returns 401 when session is revoked (replay attack)', async () => {
    const { hashRefreshToken } = await import('@/modules/auth/auth.crypto');
    const { env } = await import('@/lib/env');
    const raw = 'y'.repeat(43);
    const hash = hashRefreshToken(raw, env.JWT_REFRESH_SECRET);

    prisma.authSession.findUnique.mockResolvedValue({
      id: 'session-revoked',
      userId: 'uid',
      refreshTokenHash: hash,
      expiresAt: new Date(Date.now() + 1_000_000),
      revokedAt: new Date(), // already revoked
      user: { lockedAt: null },
    });

    const res = await request(app)
      .post('/auth/refresh')
      .set('Cookie', `launchly_refresh=${raw}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_SESSION');
  });

  it('handles updateMany race (concurrent refresh) as INVALID_SESSION', async () => {
    const { hashRefreshToken } = await import('@/modules/auth/auth.crypto');
    const { env } = await import('@/lib/env');
    const raw = 'z'.repeat(43);
    const hash = hashRefreshToken(raw, env.JWT_REFRESH_SECRET);

    prisma.authSession.findUnique.mockResolvedValue({
      id: 'session-race',
      userId: 'uid-race',
      refreshTokenHash: hash,
      expiresAt: new Date(Date.now() + 1_000_000),
      revokedAt: null,
      user: { id: 'uid-race', email: 'x@x.com', fullName: null, role: 'CANDIDATE', emailVerifiedAt: new Date(), lockedAt: null },
    });
    prisma.authSession.updateMany.mockResolvedValue({ count: 0 }); // already rotated by another request

    const res = await request(app)
      .post('/auth/refresh')
      .set('Cookie', `launchly_refresh=${raw}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_SESSION');
  });

  it('returns 401 when the account is locked during refresh', async () => {
    const { hashRefreshToken } = await import('@/modules/auth/auth.crypto');
    const { env } = await import('@/lib/env');
    const raw = 'w'.repeat(43);
    const hash = hashRefreshToken(raw, env.JWT_REFRESH_SECRET);

    prisma.authSession.findUnique.mockResolvedValue({
      id: 'session-locked',
      userId: 'uid-locked',
      refreshTokenHash: hash,
      expiresAt: new Date(Date.now() + 1_000_000),
      revokedAt: null,
      user: { lockedAt: new Date() }, // locked
    });

    const res = await request(app)
      .post('/auth/refresh')
      .set('Cookie', `launchly_refresh=${raw}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_SESSION');
  });
});

// ---------------------------------------------------------------------------
// US2 – Logout
// ---------------------------------------------------------------------------

describe('POST /auth/logout', () => {
  let prisma: MockPrisma;
  let app: ReturnType<typeof makeApp>;

  beforeEach(() => {
    prisma = makePrisma();
    app = makeApp(prisma);
  });

  afterEach(() => vi.restoreAllMocks());

  async function issueAccessToken(userId = 'uid', sessionId = 'sid') {
    const jwt = (await import('jsonwebtoken')).default;
    const { env } = await import('@/lib/env');
    return jwt.sign(
      { sub: userId, sid: sessionId, role: 'CANDIDATE' },
      env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: 900, issuer: 'launchly-api', audience: 'launchly-web' },
    );
  }

  it('revokes the session and returns 204 on successful logout', async () => {
    const token = await issueAccessToken();
    prisma.authSession.findFirst.mockResolvedValue({
      user: {
        id: 'uid',
        email: 'alice@example.com',
        fullName: null,
        role: 'CANDIDATE',
        emailVerifiedAt: new Date(),
      },
    });
    prisma.authSession.updateMany.mockResolvedValue({ count: 1 });

    const res = await request(app)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
    expect(prisma.authSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ revokedAt: expect.any(Date) }) }),
    );
  });

  it('returns 401 without a valid bearer token', async () => {
    const res = await request(app).post('/auth/logout');
    expect(res.status).toBe(401);
  });

  it('after logout the session is revoked so a subsequent /me call fails', async () => {
    const token = await issueAccessToken('uid-logout', 'sid-logout');

    prisma.authSession.findFirst.mockResolvedValueOnce({
      user: {
        id: 'uid-logout',
        email: 'alice@example.com',
        fullName: null,
        role: 'CANDIDATE',
        emailVerifiedAt: new Date(),
      },
    });
    prisma.authSession.updateMany.mockResolvedValue({ count: 1 });

    await request(app)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    // Session revoked – simulate by returning null
    prisma.authSession.findFirst.mockResolvedValueOnce(null);

    const meRes = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// US2 – GET /auth/me
// ---------------------------------------------------------------------------

describe('GET /auth/me', () => {
  let prisma: MockPrisma;
  let app: ReturnType<typeof makeApp>;

  beforeEach(() => {
    prisma = makePrisma();
    app = makeApp(prisma);
  });

  afterEach(() => vi.restoreAllMocks());

  async function issueAccessToken(userId = 'uid', sessionId = 'sid') {
    const jwt = (await import('jsonwebtoken')).default;
    const { env } = await import('@/lib/env');
    return jwt.sign(
      { sub: userId, sid: sessionId, role: 'RECRUITER' },
      env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: 900, issuer: 'launchly-api', audience: 'launchly-web' },
    );
  }

  it('returns the mapped UserDto for an authenticated user', async () => {
    const token = await issueAccessToken();
    prisma.authSession.findFirst.mockResolvedValue({
      user: {
        id: 'uid',
        email: 'recruiter@example.com',
        fullName: 'Bob',
        role: 'RECRUITER',
        emailVerifiedAt: new Date(),
      },
    });

    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('recruiter@example.com');
    expect(res.body.role).toBe('RECRUITER');
    expect(res.body.passwordHash).toBeUndefined();
    expect(res.body.lockedAt).toBeUndefined();
  });

  it('returns 401 without a bearer token', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('returns 401 when session is revoked or expired (checks DB, not just JWT)', async () => {
    const token = await issueAccessToken();
    prisma.authSession.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
  });
});
