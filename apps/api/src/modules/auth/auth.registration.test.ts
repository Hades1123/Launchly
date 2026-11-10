/**
 * T008 / T011 – Registration and email verification tests
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

function makeMailCapture() {
  const sent: Array<{ to: string; subject: string }> = [];
  const provider: MailProvider = {
    async send(msg) { sent.push({ to: msg.to, subject: msg.subject }); },
  };
  return { provider, sent };
}

const noopGoogle: GoogleIdentityProvider = { verify: vi.fn() };

function makeApp(prisma: MockPrisma, mail: MailProvider) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  const service = createAuthService(prisma as unknown as PrismaClient, mail, noopGoogle);
  app.use('/auth', createAuthRouter(service));
  app.use(errorHandler);
  return app;
}

/** Set up transaction mock so createAuthToken works. */
function setupTx(prisma: MockPrisma) {
  prisma.$transaction.mockImplementation(async (ops: unknown) => {
    if (Array.isArray(ops)) return Promise.all(ops);
    return (ops as (tx: unknown) => Promise<unknown>)(prisma);
  });
  prisma.authToken.updateMany.mockResolvedValue({ count: 0 });
  prisma.authToken.create.mockResolvedValue({});
}

afterEach(() => vi.restoreAllMocks());

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

describe('POST /auth/register', () => {
  it('creates an unverified account and sends a verification email on success', async () => {
    const prisma = makePrisma();
    const mail = makeMailCapture();
    const app = makeApp(prisma, mail.provider);

    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'user-id-1',
      email: 'alice@example.com',
      fullName: null,
      role: 'CANDIDATE',
      emailVerifiedAt: null,
    });
    setupTx(prisma);

    const res = await request(app).post('/auth/register').send({
      email: 'alice@example.com',
      password: 'StrongPass123',
      role: 'CANDIDATE',
    });

    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/check your email/i);
    expect(mail.sent[0]?.to).toBe('alice@example.com');
    expect(mail.sent[0]?.subject).toMatch(/xác nhận/i);
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ fullName: 'alice' }) }),
    );
  });

  it('normalizes email to lowercase before duplicate check', async () => {
    const prisma = makePrisma();
    const app = makeApp(prisma, makeMailCapture().provider);

    prisma.user.findUnique.mockResolvedValue({ id: 'existing', email: 'alice@example.com' });

    const res = await request(app).post('/auth/register').send({
      email: '  ALICE@EXAMPLE.COM  ',
      password: 'StrongPass123',
      role: 'CANDIDATE',
    });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_ALREADY_REGISTERED');
  });

  it('rejects ADMIN self-registration with 400 validation error', async () => {
    const prisma = makePrisma();
    const app = makeApp(prisma, makeMailCapture().provider);

    const res = await request(app).post('/auth/register').send({
      email: 'admin@example.com',
      password: 'StrongPass123',
      role: 'ADMIN',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an invalid email format', async () => {
    const prisma = makePrisma();
    const app = makeApp(prisma, makeMailCapture().provider);

    const res = await request(app).post('/auth/register').send({
      email: 'not-an-email',
      password: 'StrongPass123',
      role: 'CANDIDATE',
    });

    expect(res.status).toBe(400);
  });

  it('rejects a password shorter than 8 characters', async () => {
    const prisma = makePrisma();
    const app = makeApp(prisma, makeMailCapture().provider);

    const res = await request(app).post('/auth/register').send({
      email: 'alice@example.com',
      password: 'short',
      role: 'CANDIDATE',
    });

    expect(res.status).toBe(400);
  });

  it('does not echo submitted password values in validation errors', async () => {
    const app = makeApp(makePrisma(), makeMailCapture().provider);
    const response = await request(app).post('/auth/register').send({
      email: 'alice@example.com',
      password: 'secret',
      role: 'CANDIDATE',
    });

    expect(response.status).toBe(400);
    expect(JSON.stringify(response.body)).not.toContain('secret');
  });

  it('rolls back the account and returns 503 when verification email delivery fails', async () => {
    const prisma = makePrisma();
    const failMail: MailProvider = { send: vi.fn().mockRejectedValue(new Error('SMTP refused')) };
    const app = makeApp(prisma, failMail);

    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'user-id-rollback',
      email: 'bob@example.com',
      fullName: null,
      role: 'CANDIDATE',
      emailVerifiedAt: null,
    });
    setupTx(prisma);
    prisma.authToken.deleteMany.mockResolvedValue({ count: 1 });
    prisma.user.delete.mockResolvedValue({});

    const res = await request(app).post('/auth/register').send({
      email: 'bob@example.com',
      password: 'StrongPass123',
      role: 'CANDIDATE',
    });

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('EMAIL_DELIVERY_FAILED');
    expect(prisma.user.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user-id-rollback' } }),
    );
  });

  it('handles Prisma unique constraint race condition as a duplicate error', async () => {
    const prisma = makePrisma();
    const app = makeApp(prisma, makeMailCapture().provider);

    prisma.user.findUnique.mockResolvedValue(null);
    const prismaErr = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
    prisma.user.create.mockRejectedValue(prismaErr);

    const res = await request(app).post('/auth/register').send({
      email: 'alice@example.com',
      password: 'StrongPass123',
      role: 'CANDIDATE',
    });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_ALREADY_REGISTERED');
  });
});

// ---------------------------------------------------------------------------
// Email verification
// ---------------------------------------------------------------------------

describe('POST /auth/verify-email', () => {
  const VALID_TOKEN = 'a'.repeat(43);

  it('marks the account as verified on a valid, unexpired, unused token', async () => {
    const prisma = makePrisma();
    const app = makeApp(prisma, makeMailCapture().provider);
    const future = new Date(Date.now() + 60_000);

    prisma.authToken.findUnique.mockResolvedValue({
      id: 'token-id-1',
      userId: 'user-id-1',
      purpose: 'EMAIL_VERIFICATION',
      consumedAt: null,
      expiresAt: future,
      tokenHash: 'some-hash',
      providerSubject: null,
      user: { id: 'user-id-1', email: 'alice@example.com', fullName: null, role: 'CANDIDATE', emailVerifiedAt: null },
    });
    setupTx(prisma);
    prisma.authToken.updateMany.mockResolvedValue({ count: 1 });
    prisma.user.update.mockResolvedValue({});

    const res = await request(app).post('/auth/verify-email').send({ token: VALID_TOKEN });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/verified/i);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ emailVerifiedAt: expect.any(Date) }) }),
    );
  });

  it('rejects a missing or malformed token with 400', async () => {
    const prisma = makePrisma();
    const app = makeApp(prisma, makeMailCapture().provider);

    const res = await request(app).post('/auth/verify-email').send({ token: 'short' });
    expect(res.status).toBe(400);
  });

  it('rejects an already-used token', async () => {
    const prisma = makePrisma();
    const app = makeApp(prisma, makeMailCapture().provider);

    prisma.authToken.findUnique.mockResolvedValue({
      id: 'token-id-2',
      userId: 'user-id-2',
      purpose: 'EMAIL_VERIFICATION',
      consumedAt: new Date(Date.now() - 1000),
      expiresAt: new Date(Date.now() + 60_000),
      tokenHash: 'h2',
      providerSubject: null,
      user: {},
    });

    const res = await request(app).post('/auth/verify-email').send({ token: VALID_TOKEN });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_OR_EXPIRED_TOKEN');
  });

  it('rejects an expired token', async () => {
    const prisma = makePrisma();
    const app = makeApp(prisma, makeMailCapture().provider);

    prisma.authToken.findUnique.mockResolvedValue({
      id: 'token-id-3',
      userId: 'user-id-3',
      purpose: 'EMAIL_VERIFICATION',
      consumedAt: null,
      expiresAt: new Date(Date.now() - 1000),
      tokenHash: 'h3',
      providerSubject: null,
      user: {},
    });

    const res = await request(app).post('/auth/verify-email').send({ token: VALID_TOKEN });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_OR_EXPIRED_TOKEN');
  });

  it('rejects a token with wrong purpose', async () => {
    const prisma = makePrisma();
    const app = makeApp(prisma, makeMailCapture().provider);

    prisma.authToken.findUnique.mockResolvedValue({
      id: 'token-id-4',
      userId: 'user-id-4',
      purpose: 'PASSWORD_RESET',
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      tokenHash: 'h4',
      providerSubject: null,
      user: {},
    });

    const res = await request(app).post('/auth/verify-email').send({ token: VALID_TOKEN });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_OR_EXPIRED_TOKEN');
  });

  it('handles updateMany race condition as invalid token', async () => {
    const prisma = makePrisma();
    const app = makeApp(prisma, makeMailCapture().provider);

    prisma.authToken.findUnique.mockResolvedValue({
      id: 'token-race',
      userId: 'user-race',
      purpose: 'EMAIL_VERIFICATION',
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      tokenHash: 'hrace',
      providerSubject: null,
      user: { id: 'user-race', email: 'x@x.com', fullName: null, role: 'CANDIDATE', emailVerifiedAt: null },
    });
    prisma.authToken.updateMany.mockResolvedValue({ count: 0 }); // race: already consumed
    setupTx(prisma);

    const res = await request(app).post('/auth/verify-email').send({ token: VALID_TOKEN });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_OR_EXPIRED_TOKEN');
  });
});

// ---------------------------------------------------------------------------
// Resend verification
// ---------------------------------------------------------------------------

describe('POST /auth/resend-verification', () => {
  it('sends a new verification email and returns neutral message for unverified accounts', async () => {
    const prisma = makePrisma();
    const mail = makeMailCapture();
    const app = makeApp(prisma, mail.provider);

    prisma.user.findUnique.mockResolvedValue({
      id: 'user-resend',
      email: 'pending@example.com',
      fullName: null,
      role: 'CANDIDATE',
      emailVerifiedAt: null,
    });
    setupTx(prisma);

    const res = await request(app)
      .post('/auth/resend-verification')
      .send({ email: 'pending@example.com' });

    expect(res.status).toBe(202);
    expect(mail.sent[0]?.to).toBe('pending@example.com');
  });

  it('returns neutral message for already-verified accounts (no enumeration)', async () => {
    const prisma = makePrisma();
    const mail = makeMailCapture();
    const app = makeApp(prisma, mail.provider);

    prisma.user.findUnique.mockResolvedValue({
      id: 'user-verified',
      email: 'verified@example.com',
      fullName: null,
      role: 'CANDIDATE',
      emailVerifiedAt: new Date(),
    });

    const res = await request(app)
      .post('/auth/resend-verification')
      .send({ email: 'verified@example.com' });

    expect(res.status).toBe(202);
    expect(mail.sent).toHaveLength(0);
  });

  it('returns neutral message for unknown emails (no enumeration)', async () => {
    const prisma = makePrisma();
    const mail = makeMailCapture();
    const app = makeApp(prisma, mail.provider);

    prisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/auth/resend-verification')
      .send({ email: 'unknown@example.com' });

    expect(res.status).toBe(202);
    expect(mail.sent).toHaveLength(0);
  });
});
