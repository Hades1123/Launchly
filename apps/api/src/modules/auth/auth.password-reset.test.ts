/**
 * T025 / T028 – Password recovery tests: forgot-password and reset-password
 */
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAuthService } from '@/modules/auth/auth.service';
import { createAuthRouter } from '@/modules/auth/auth.routes';
import { errorHandler } from '@/middlewares/error-handler';
import type { MailProvider } from '@/providers/mail/mail-provider';
import type { GoogleIdentityProvider } from '@/providers/google/google.provider';
import type { PrismaClient } from '@/generated/prisma/client';

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

function setupTx(prisma: MockPrisma) {
  prisma.$transaction.mockImplementation(async (ops: unknown) => {
    if (Array.isArray(ops)) return Promise.all(ops);
    return (ops as (tx: unknown) => Promise<unknown>)(prisma);
  });
  prisma.authToken.updateMany.mockResolvedValue({ count: 0 });
  prisma.authToken.create.mockResolvedValue({});
}

const noopGoogle: GoogleIdentityProvider = { verify: vi.fn() };

function makeMailCapture() {
  const sent: Array<{ to: string; subject: string; text: string }> = [];
  const provider: MailProvider = {
    async send(msg) { sent.push({ to: msg.to, subject: msg.subject, text: msg.text }); },
  };
  return { provider, sent };
}

function makeApp(prisma: MockPrisma, mail: MailProvider) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  const service = createAuthService(prisma as unknown as PrismaClient, mail, noopGoogle);
  app.use('/auth', createAuthRouter(service));
  app.use(errorHandler);
  return app;
}

const VALID_TOKEN = 'a'.repeat(43);

afterEach(() => vi.restoreAllMocks());

// ---------------------------------------------------------------------------
// US4 – Forgot password
// ---------------------------------------------------------------------------

describe('POST /auth/forgot-password', () => {
  it('sends a reset email and returns the neutral message for a registered email', async () => {
    const prisma = makePrisma();
    const mail = makeMailCapture();
    const app = makeApp(prisma, mail.provider);
    setupTx(prisma);

    prisma.user.findUnique.mockResolvedValue({ id: 'uid-forgot', email: 'alice@example.com' });

    const res = await request(app)
      .post('/auth/forgot-password')
      .send({ email: 'alice@example.com' });

    expect(res.status).toBe(202);
    expect(res.body.message).toMatch(/eligible/i);
    expect(mail.sent[0]?.to).toBe('alice@example.com');
    expect(mail.sent[0]?.subject).toMatch(/mật khẩu/i);
    // Email subject must not expose the raw token
    expect(mail.sent[0]?.subject).not.toMatch(/token/i);
  });

  it('returns the SAME neutral message for an unregistered email (non-enumerating)', async () => {
    const prisma = makePrisma();
    const mail = makeMailCapture();
    const app = makeApp(prisma, mail.provider);

    prisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/auth/forgot-password')
      .send({ email: 'unknown@example.com' });

    expect(res.status).toBe(202);
    expect(res.body.message).toMatch(/eligible/i);
    expect(mail.sent).toHaveLength(0);
  });

  it('returns neutral message even when email delivery fails (hides server errors)', async () => {
    const prisma = makePrisma();
    const failMail: MailProvider = { send: vi.fn().mockRejectedValue(new Error('SMTP down')) };
    const app = makeApp(prisma, failMail);
    setupTx(prisma);

    prisma.user.findUnique.mockResolvedValue({ id: 'uid-fail', email: 'fail@example.com' });
    prisma.authToken.deleteMany.mockResolvedValue({ count: 1 });

    const res = await request(app)
      .post('/auth/forgot-password')
      .send({ email: 'fail@example.com' });

    // Controller swallows EMAIL_DELIVERY_FAILED and returns 202
    expect(res.status).toBe(202);
    expect(res.body.message).toMatch(/eligible/i);
    // Token created for this attempt must be cleaned up
    expect(prisma.authToken.deleteMany).toHaveBeenCalled();
  });

  it('returns 400 for an invalid email format', async () => {
    const prisma = makePrisma();
    const app = makeApp(prisma, makeMailCapture().provider);

    const res = await request(app)
      .post('/auth/forgot-password')
      .send({ email: 'not-an-email' });

    expect(res.status).toBe(400);
  });

  it('rate-limits repeated recovery requests', async () => {
    const prisma = makePrisma();
    const app = makeApp(prisma, makeMailCapture().provider);
    prisma.user.findUnique.mockResolvedValue(null);

    const responses = [];
    for (let index = 0; index < 6; index += 1) {
      responses.push(
        await request(app)
          .post('/auth/forgot-password')
          .send({ email: `unknown${index}@example.com` }),
      );
    }

    expect(responses.slice(0, 5).every((response) => response.status === 202)).toBe(true);
    expect(responses[5]?.status).toBe(429);
  });
});

// ---------------------------------------------------------------------------
// US4 – Reset password
// ---------------------------------------------------------------------------

describe('POST /auth/reset-password', () => {
  it('updates the password hash, revokes all sessions, and returns 204', async () => {
    const prisma = makePrisma();
    const app = makeApp(prisma, makeMailCapture().provider);

    prisma.authToken.findUnique.mockResolvedValue({
      id: 'tok-reset',
      userId: 'uid-reset',
      purpose: 'PASSWORD_RESET',
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      tokenHash: 'h-reset',
      providerSubject: null,
    });
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma));
    prisma.authToken.updateMany.mockResolvedValue({ count: 1 });
    prisma.user.update.mockResolvedValue({});
    prisma.authSession.updateMany.mockResolvedValue({ count: 2 });

    const res = await request(app)
      .post('/auth/reset-password')
      .send({ token: VALID_TOKEN, password: 'NewStrongPass1!' });

    expect(res.status).toBe(204);
    // All sessions for the user must be revoked
    expect(prisma.authSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'uid-reset', revokedAt: null }),
        data: expect.objectContaining({ revokedAt: expect.any(Date) }),
      }),
    );
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ passwordHash: expect.any(String) }) }),
    );
  });

  it('stores a hashed password, never the plain-text password', async () => {
    const prisma = makePrisma();
    const app = makeApp(prisma, makeMailCapture().provider);

    prisma.authToken.findUnique.mockResolvedValue({
      id: 'tok-hash',
      userId: 'uid-hash',
      purpose: 'PASSWORD_RESET',
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      tokenHash: 'h-hash',
      providerSubject: null,
    });
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma));
    prisma.authToken.updateMany.mockResolvedValue({ count: 1 });
    prisma.user.update.mockResolvedValue({});
    prisma.authSession.updateMany.mockResolvedValue({ count: 0 });

    await request(app)
      .post('/auth/reset-password')
      .send({ token: VALID_TOKEN, password: 'MyNewSup3rPass!' });

    const updateCall = prisma.user.update.mock.calls[0]?.[0] as { data: { passwordHash: string } };
    const hash = updateCall?.data?.passwordHash;
    expect(hash).toBeDefined();
    expect(hash).not.toContain('MyNewSup3rPass!');
    expect(hash).toMatch(/^scrypt\$/);

    const { verifyPassword } = await import('@/modules/auth/auth.crypto');
    expect(await verifyPassword('MyNewSup3rPass!', hash!)).toBe(true);
  });

  it('returns 400 for an expired reset token', async () => {
    const prisma = makePrisma();
    const app = makeApp(prisma, makeMailCapture().provider);

    prisma.authToken.findUnique.mockResolvedValue({
      id: 'tok-exp',
      userId: 'uid',
      purpose: 'PASSWORD_RESET',
      consumedAt: null,
      expiresAt: new Date(Date.now() - 1000),
      tokenHash: 'h-exp',
      providerSubject: null,
    });

    const res = await request(app)
      .post('/auth/reset-password')
      .send({ token: VALID_TOKEN, password: 'NewStrongPass1!' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_OR_EXPIRED_TOKEN');
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.authSession.updateMany).not.toHaveBeenCalled();
  });

  it('returns 400 for an already-consumed reset token (replay prevention)', async () => {
    const prisma = makePrisma();
    const app = makeApp(prisma, makeMailCapture().provider);

    prisma.authToken.findUnique.mockResolvedValue({
      id: 'tok-used',
      userId: 'uid',
      purpose: 'PASSWORD_RESET',
      consumedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      tokenHash: 'h-used',
      providerSubject: null,
    });

    const res = await request(app)
      .post('/auth/reset-password')
      .send({ token: VALID_TOKEN, password: 'NewStrongPass1!' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_OR_EXPIRED_TOKEN');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('handles updateMany race (concurrent reset) without updating password', async () => {
    const prisma = makePrisma();
    const app = makeApp(prisma, makeMailCapture().provider);

    prisma.authToken.findUnique.mockResolvedValue({
      id: 'tok-race',
      userId: 'uid-race',
      purpose: 'PASSWORD_RESET',
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      tokenHash: 'h-race',
      providerSubject: null,
    });
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma));
    prisma.authToken.updateMany.mockResolvedValue({ count: 0 }); // already consumed

    const res = await request(app)
      .post('/auth/reset-password')
      .send({ token: VALID_TOKEN, password: 'NewStrongPass1!' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_OR_EXPIRED_TOKEN');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('returns 400 for a wrong-purpose token used for reset', async () => {
    const prisma = makePrisma();
    const app = makeApp(prisma, makeMailCapture().provider);

    prisma.authToken.findUnique.mockResolvedValue({
      id: 'tok-wrong',
      userId: 'uid',
      purpose: 'EMAIL_VERIFICATION',
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      tokenHash: 'h-wrong',
      providerSubject: null,
    });

    const res = await request(app)
      .post('/auth/reset-password')
      .send({ token: VALID_TOKEN, password: 'NewStrongPass1!' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_OR_EXPIRED_TOKEN');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('returns 400 for a password shorter than 8 characters', async () => {
    const prisma = makePrisma();
    const app = makeApp(prisma, makeMailCapture().provider);

    const res = await request(app)
      .post('/auth/reset-password')
      .send({ token: VALID_TOKEN, password: 'short' });

    expect(res.status).toBe(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('after reset, all prior sessions are revoked (revokedAt set for all)', async () => {
    const prisma = makePrisma();
    const app = makeApp(prisma, makeMailCapture().provider);

    prisma.authToken.findUnique.mockResolvedValue({
      id: 'tok-revoke',
      userId: 'uid-revoke',
      purpose: 'PASSWORD_RESET',
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      tokenHash: 'h-revoke',
      providerSubject: null,
    });
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma));
    prisma.authToken.updateMany.mockResolvedValue({ count: 1 });
    prisma.user.update.mockResolvedValue({});
    prisma.authSession.updateMany.mockResolvedValue({ count: 5 });

    await request(app)
      .post('/auth/reset-password')
      .send({ token: VALID_TOKEN, password: 'NewStrongPass1!' });

    // Must revoke all active sessions
    const revokeCall = prisma.authSession.updateMany.mock.calls.find(
      (call: unknown[]) => {
        const arg = call[0] as { data?: { revokedAt?: unknown }; where?: { revokedAt?: unknown } };
        return arg?.data?.revokedAt !== undefined && arg?.where?.revokedAt === null;
      },
    );
    expect(revokeCall).toBeDefined();
  });
});
