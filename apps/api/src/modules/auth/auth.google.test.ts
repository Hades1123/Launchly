/**
 * T020 / T024 – Google sign-in and account-linking tests
 */
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from '@/lib/http-error';
import { createAuthService } from '@/modules/auth/auth.service';
import { createAuthRouter } from '@/modules/auth/auth.routes';
import { errorHandler } from '@/middlewares/error-handler';
import type { MailProvider } from '@/providers/mail/mail-provider';
import type { GoogleIdentityProvider, GoogleIdentity } from '@/providers/google/google.provider';
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

function makeApp(prisma: MockPrisma, mail: MailProvider, google: GoogleIdentityProvider) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  const service = createAuthService(prisma as unknown as PrismaClient, mail, google);
  app.use('/auth', createAuthRouter(service));
  app.use(errorHandler);
  return app;
}

function setupTx(prisma: MockPrisma) {
  prisma.$transaction.mockImplementation(async (ops: unknown) => {
    if (Array.isArray(ops)) return Promise.all(ops);
    return (ops as (tx: unknown) => Promise<unknown>)(prisma);
  });
  prisma.authToken.updateMany.mockResolvedValue({ count: 0 });
  prisma.authToken.create.mockResolvedValue({});
}

const GMAIL_IDENTITY: GoogleIdentity = {
  subject: 'google-sub-123',
  email: 'alice@gmail.com',
  emailVerified: true,
  fullName: 'Alice',
  hostedDomain: null,
};

const WORKSPACE_IDENTITY: GoogleIdentity = {
  subject: 'google-sub-456',
  email: 'bob@acme.com',
  emailVerified: true,
  fullName: 'Bob',
  hostedDomain: 'acme.com',
};

const EXTERNAL_IDENTITY: GoogleIdentity = {
  subject: 'google-sub-789',
  email: 'carol@external.io',
  emailVerified: true,
  fullName: 'Carol',
  hostedDomain: null,
};

afterEach(() => vi.restoreAllMocks());

// ---------------------------------------------------------------------------
// Existing linked account
// ---------------------------------------------------------------------------

describe('POST /auth/google – existing linked account', () => {
  it('signs in directly when googleId already matches', async () => {
    const prisma = makePrisma();
    const google: GoogleIdentityProvider = { verify: vi.fn().mockResolvedValue(GMAIL_IDENTITY) };
    const app = makeApp(prisma, makeMailCapture().provider, google);

    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'uid-linked',
      email: 'alice@gmail.com',
      fullName: 'Alice',
      role: 'CANDIDATE',
      emailVerifiedAt: new Date(),
      lockedAt: null,
    });
    prisma.authSession.create.mockResolvedValue({});

    const res = await request(app).post('/auth/google').send({ idToken: 'valid-id-token' });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.email).toBe('alice@gmail.com');
    expect(res.body.refreshToken).toBeUndefined();
  });

  it('returns 403 ACCOUNT_LOCKED for a locked linked account', async () => {
    const prisma = makePrisma();
    const google: GoogleIdentityProvider = { verify: vi.fn().mockResolvedValue(GMAIL_IDENTITY) };
    const app = makeApp(prisma, makeMailCapture().provider, google);

    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'uid-locked',
      email: 'alice@gmail.com',
      fullName: null,
      role: 'CANDIDATE',
      emailVerifiedAt: new Date(),
      lockedAt: new Date(),
    });

    const res = await request(app).post('/auth/google').send({ idToken: 'valid-id-token' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_LOCKED');
  });
});

// ---------------------------------------------------------------------------
// Matching email – Gmail / Workspace (auto-link)
// ---------------------------------------------------------------------------

describe('POST /auth/google – matching email, Gmail/Workspace domain (auto-link)', () => {
  it('links and signs in when Google confirms Gmail email matches existing unlinked account', async () => {
    const prisma = makePrisma();
    const google: GoogleIdentityProvider = { verify: vi.fn().mockResolvedValue(GMAIL_IDENTITY) };
    const mail = makeMailCapture();
    const app = makeApp(prisma, mail.provider, google);

    prisma.user.findUnique.mockResolvedValueOnce(null); // no match by googleId
    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'uid-match-gmail',
      email: 'alice@gmail.com',
      fullName: null,
      role: 'CANDIDATE',
      emailVerifiedAt: new Date(),
      lockedAt: null,
    });
    prisma.user.update.mockResolvedValue({
      id: 'uid-match-gmail',
      email: 'alice@gmail.com',
      fullName: null,
      role: 'CANDIDATE',
      emailVerifiedAt: new Date(),
      googleId: GMAIL_IDENTITY.subject,
    });
    prisma.authSession.create.mockResolvedValue({});

    const res = await request(app).post('/auth/google').send({ idToken: 'valid-id-token' });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(mail.sent).toHaveLength(0); // no confirmation email for safe domains
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ googleId: GMAIL_IDENTITY.subject }) }),
    );
  });

  it('auto-links for Google Workspace hosted domain', async () => {
    const prisma = makePrisma();
    const google: GoogleIdentityProvider = { verify: vi.fn().mockResolvedValue(WORKSPACE_IDENTITY) };
    const mail = makeMailCapture();
    const app = makeApp(prisma, mail.provider, google);

    prisma.user.findUnique.mockResolvedValueOnce(null);
    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'uid-ws',
      email: 'bob@acme.com',
      fullName: null,
      role: 'RECRUITER',
      emailVerifiedAt: new Date(),
      lockedAt: null,
    });
    prisma.user.update.mockResolvedValue({
      id: 'uid-ws', email: 'bob@acme.com', fullName: null, role: 'RECRUITER', emailVerifiedAt: new Date(),
    });
    prisma.authSession.create.mockResolvedValue({});

    const res = await request(app).post('/auth/google').send({ idToken: 'valid-id-token' });

    expect(res.status).toBe(200);
    expect(mail.sent).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Matching email – external domain (email challenge)
// ---------------------------------------------------------------------------

describe('POST /auth/google – matching email, external domain (email challenge)', () => {
  it('sends confirmation email and returns requiresEmailVerification for external domains', async () => {
    const prisma = makePrisma();
    const google: GoogleIdentityProvider = { verify: vi.fn().mockResolvedValue(EXTERNAL_IDENTITY) };
    const mail = makeMailCapture();
    const app = makeApp(prisma, mail.provider, google);

    setupTx(prisma);
    prisma.user.findUnique.mockResolvedValueOnce(null);
    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'uid-ext',
      email: 'carol@external.io',
      fullName: null,
      role: 'CANDIDATE',
      emailVerifiedAt: new Date(),
      lockedAt: null,
    });

    const res = await request(app).post('/auth/google').send({ idToken: 'valid-id-token' });

    expect(res.status).toBe(200);
    expect(res.body.requiresEmailVerification).toBe(true);
    expect(res.body.accessToken).toBeUndefined();
    expect(mail.sent[0]?.to).toBe('carol@external.io');
    expect(mail.sent[0]?.subject).toMatch(/confirm/i);
  });

  it('does NOT create an account or session when email challenge is triggered', async () => {
    const prisma = makePrisma();
    const google: GoogleIdentityProvider = { verify: vi.fn().mockResolvedValue(EXTERNAL_IDENTITY) };
    const mail = makeMailCapture();
    const app = makeApp(prisma, mail.provider, google);

    setupTx(prisma);
    prisma.user.findUnique.mockResolvedValueOnce(null);
    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'uid-ext2',
      email: 'carol@external.io',
      fullName: null,
      role: 'CANDIDATE',
      emailVerifiedAt: new Date(),
      lockedAt: null,
    });

    await request(app).post('/auth/google').send({ idToken: 'valid-id-token' });

    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.authSession.create).not.toHaveBeenCalled();
  });

  it('removes the link token and does not issue a session when email delivery fails', async () => {
    const prisma = makePrisma();
    const google: GoogleIdentityProvider = {
      verify: vi.fn().mockResolvedValue(EXTERNAL_IDENTITY),
    };
    const mail: MailProvider = {
      send: vi.fn().mockRejectedValue(new Error('Mail service unavailable')),
    };
    const app = makeApp(prisma, mail, google);
    setupTx(prisma);
    prisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 'uid-ext-failure',
      email: 'carol@external.io',
      fullName: null,
      role: 'CANDIDATE',
      emailVerifiedAt: new Date(),
      lockedAt: null,
    });
    prisma.authToken.deleteMany.mockResolvedValue({ count: 1 });

    const res = await request(app)
      .post('/auth/google')
      .send({ idToken: 'valid-id-token' });

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('EMAIL_DELIVERY_FAILED');
    expect(prisma.authToken.deleteMany).toHaveBeenCalled();
    expect(prisma.authSession.create).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// New user – role selection
// ---------------------------------------------------------------------------

describe('POST /auth/google – new user, role selection', () => {
  it('returns requiresRoleSelection when no account exists and no role is provided', async () => {
    const prisma = makePrisma();
    const google: GoogleIdentityProvider = { verify: vi.fn().mockResolvedValue(GMAIL_IDENTITY) };
    const app = makeApp(prisma, makeMailCapture().provider, google);

    prisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app).post('/auth/google').send({ idToken: 'valid-id-token' });

    expect(res.status).toBe(200);
    expect(res.body.requiresRoleSelection).toBe(true);
    expect(res.body.roles).toEqual(expect.arrayContaining(['CANDIDATE', 'RECRUITER']));
    expect(res.body.accessToken).toBeUndefined();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('creates account with selected role and returns session', async () => {
    const prisma = makePrisma();
    const google: GoogleIdentityProvider = { verify: vi.fn().mockResolvedValue(GMAIL_IDENTITY) };
    const app = makeApp(prisma, makeMailCapture().provider, google);

    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'uid-new',
      email: 'alice@gmail.com',
      fullName: 'Alice',
      role: 'CANDIDATE',
      emailVerifiedAt: new Date(),
    });
    prisma.authSession.create.mockResolvedValue({});

    const res = await request(app)
      .post('/auth/google')
      .send({ idToken: 'valid-id-token', role: 'CANDIDATE' });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: 'CANDIDATE', googleId: GMAIL_IDENTITY.subject }),
      }),
    );
  });

  it('rejects ADMIN role selection via Google sign-in with 400', async () => {
    const prisma = makePrisma();
    const google: GoogleIdentityProvider = { verify: vi.fn().mockResolvedValue(GMAIL_IDENTITY) };
    const app = makeApp(prisma, makeMailCapture().provider, google);

    const res = await request(app)
      .post('/auth/google')
      .send({ idToken: 'valid-id-token', role: 'ADMIN' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Invalid identity
// ---------------------------------------------------------------------------

describe('POST /auth/google – invalid identity', () => {
  it('returns 401 and creates no account when Google verification fails', async () => {
    const prisma = makePrisma();
    const google: GoogleIdentityProvider = {
      verify: vi.fn().mockRejectedValue(new HttpError(401, 'INVALID_GOOGLE_IDENTITY', 'invalid')),
    };
    const app = makeApp(prisma, makeMailCapture().provider, google);

    const res = await request(app).post('/auth/google').send({ idToken: 'bad-token' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_GOOGLE_IDENTITY');
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.authSession.create).not.toHaveBeenCalled();
  });

  it('rejects identities whose email is not verified, even if a provider adapter returns them', async () => {
    const prisma = makePrisma();
    const unverifiedIdentity = { ...GMAIL_IDENTITY, emailVerified: false };
    const google: GoogleIdentityProvider = {
      verify: vi.fn().mockResolvedValue(unverifiedIdentity),
    };
    const app = makeApp(prisma, makeMailCapture().provider, google);

    const res = await request(app)
      .post('/auth/google')
      .send({ idToken: 'valid-id-token' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_GOOGLE_IDENTITY');
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.authSession.create).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// POST /auth/google/complete-link
// ---------------------------------------------------------------------------

describe('POST /auth/google/complete-link', () => {
  const TOKEN = 'a'.repeat(43);

  it('links the Google identity and creates a session on valid confirmation token', async () => {
    const prisma = makePrisma();
    const app = makeApp(prisma, makeMailCapture().provider, { verify: vi.fn() });

    const future = new Date(Date.now() + 60_000);
    prisma.authToken.findUnique.mockResolvedValue({
      id: 'tok-id',
      userId: 'uid-link',
      purpose: 'GOOGLE_ACCOUNT_LINK',
      providerSubject: 'google-sub-789',
      consumedAt: null,
      expiresAt: future,
      tokenHash: 'some-hash',
      user: { id: 'uid-link', email: 'carol@external.io', fullName: null, role: 'CANDIDATE', emailVerifiedAt: new Date(), lockedAt: null },
    });
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma));
    prisma.authToken.updateMany.mockResolvedValue({ count: 1 });
    prisma.user.update.mockResolvedValue({
      id: 'uid-link', email: 'carol@external.io', fullName: null, role: 'CANDIDATE', emailVerifiedAt: new Date(), googleId: 'google-sub-789',
    });
    prisma.authSession.create.mockResolvedValue({});

    const res = await request(app).post('/auth/google/complete-link').send({ token: TOKEN });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ googleId: 'google-sub-789' }) }),
    );
  });

  it('returns 400 for an expired link confirmation token', async () => {
    const prisma = makePrisma();
    const app = makeApp(prisma, makeMailCapture().provider, { verify: vi.fn() });

    prisma.authToken.findUnique.mockResolvedValue({
      id: 'tok-exp',
      userId: 'uid',
      purpose: 'GOOGLE_ACCOUNT_LINK',
      providerSubject: 'sub',
      consumedAt: null,
      expiresAt: new Date(Date.now() - 1000),
      tokenHash: 'h',
      user: {},
    });

    const res = await request(app).post('/auth/google/complete-link').send({ token: TOKEN });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_OR_EXPIRED_TOKEN');
    expect(prisma.authSession.create).not.toHaveBeenCalled();
  });

  it('returns 400 for an already-consumed link token', async () => {
    const prisma = makePrisma();
    const app = makeApp(prisma, makeMailCapture().provider, { verify: vi.fn() });

    prisma.authToken.findUnique.mockResolvedValue({
      id: 'tok-used',
      userId: 'uid',
      purpose: 'GOOGLE_ACCOUNT_LINK',
      providerSubject: 'sub',
      consumedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      tokenHash: 'h',
      user: {},
    });

    const res = await request(app).post('/auth/google/complete-link').send({ token: TOKEN });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_OR_EXPIRED_TOKEN');
  });

  it('handles updateMany race during complete-link as INVALID_OR_EXPIRED_TOKEN', async () => {
    const prisma = makePrisma();
    const app = makeApp(prisma, makeMailCapture().provider, { verify: vi.fn() });

    prisma.authToken.findUnique.mockResolvedValue({
      id: 'tok-race',
      userId: 'uid-race',
      purpose: 'GOOGLE_ACCOUNT_LINK',
      providerSubject: 'sub-race',
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      tokenHash: 'h-race',
      user: { id: 'uid-race', email: 'x@y.com', fullName: null, role: 'CANDIDATE', emailVerifiedAt: new Date(), lockedAt: null },
    });
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma));
    prisma.authToken.updateMany.mockResolvedValue({ count: 0 });

    const res = await request(app).post('/auth/google/complete-link').send({ token: TOKEN });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_OR_EXPIRED_TOKEN');
    expect(prisma.authSession.create).not.toHaveBeenCalled();
  });

  it('reports an already-linked Google identity as a conflict', async () => {
    const prisma = makePrisma();
    const app = makeApp(prisma, makeMailCapture().provider, { verify: vi.fn() });

    prisma.authToken.findUnique.mockResolvedValue({
      id: 'tok-duplicate',
      userId: 'uid-duplicate',
      purpose: 'GOOGLE_ACCOUNT_LINK',
      providerSubject: 'already-linked-subject',
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      tokenHash: 'duplicate-hash',
      user: {
        id: 'uid-duplicate',
        email: 'duplicate@example.com',
        fullName: null,
        role: 'CANDIDATE',
        emailVerifiedAt: new Date(),
        lockedAt: null,
      },
    });
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn(prisma),
    );
    prisma.authToken.updateMany.mockResolvedValue({ count: 1 });
    prisma.user.update.mockRejectedValue({ code: 'P2002' });

    const res = await request(app)
      .post('/auth/google/complete-link')
      .send({ token: TOKEN });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ACCOUNT_ALREADY_REGISTERED');
    expect(prisma.authSession.create).not.toHaveBeenCalled();
  });
});
