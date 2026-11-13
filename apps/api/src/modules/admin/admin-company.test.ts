import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { adminCompanySchema, apiErrorSchema } from '@launchly/shared';
import type { PrismaClient } from '@/generated/prisma/client';
import { errorHandler } from '@/middlewares/error-handler';
import type { createAuthService } from '@/modules/auth/auth.service';
import { createAdminCompanyRouter } from '@/modules/admin/admin-company.routes';
import { createAdminCompanyService } from '@/modules/admin/admin-company.service';
import type { MailProvider } from '@/providers/mail/mail-provider';

const ID = '11111111-1111-4111-8111-111111111111';
const ADMIN_ID = 'admin-1';

const row = (overrides: Record<string, unknown> = {}) => ({
  id: ID,
  name: 'Acme',
  address: 'HCMC',
  industry: null,
  companySize: null,
  website: null,
  logoUrl: null,
  description: null,
  moderationStatus: 'PENDING',
  moderationReason: null,
  reviewedAt: null,
  createdAt: new Date('2026-11-13T00:00:00Z'),
  owner: { email: 'owner@acme.test' },
  ...overrides,
});

function makeApp(role: 'ADMIN' | 'RECRUITER' = 'ADMIN') {
  const prisma = {
    company: { findMany: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn() },
  };
  const mail = { send: vi.fn(async () => undefined) } satisfies MailProvider;
  const authService = {
    verifyAccessToken: vi.fn(() => ({ userId: ADMIN_ID, sessionId: 'session-1' })),
    getSessionUser: vi.fn(async () => ({ id: ADMIN_ID, role })),
  } as unknown as ReturnType<typeof createAuthService>;
  const app = express();
  app.use(express.json());
  app.use(
    '/admin/companies',
    createAdminCompanyRouter(
      authService,
      createAdminCompanyService(prisma as unknown as PrismaClient, mail),
    ),
  );
  app.use(errorHandler);
  return { app, prisma, mail };
}

const auth = { Authorization: 'Bearer token' };

describe('admin company access (E3)', () => {
  const routes = [
    ['get', '/admin/companies'],
    ['get', `/admin/companies/${ID}`],
    ['post', `/admin/companies/${ID}/approve`],
    ['post', `/admin/companies/${ID}/reject`],
  ] as const;

  it.each(routes)('%s %s is 401 without a token', async (method, path) => {
    const res = await request(makeApp().app)[method](path).send({ reason: 'x' });
    expect(res.status).toBe(401);
    apiErrorSchema.parse(res.body);
  });

  it.each(routes)('%s %s is 403 for a recruiter', async (method, path) => {
    const res = await request(makeApp('RECRUITER').app)[method](path).set(auth).send({ reason: 'x' });
    expect(res.status).toBe(403);
  });
});

describe('GET /admin/companies', () => {
  it('lists companies of the status, oldest first, with the owner email', async () => {
    const { app, prisma } = makeApp();
    prisma.company.findMany.mockResolvedValue([row()]);
    const res = await request(app).get('/admin/companies').set(auth);
    expect(res.status).toBe(200);
    expect(prisma.company.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { moderationStatus: 'PENDING' },
        orderBy: { createdAt: 'asc' },
      }),
    );
    expect(res.body).toHaveLength(1);
    expect(adminCompanySchema.parse(res.body[0]).ownerEmail).toBe('owner@acme.test');
  });

  it('400 for an unknown status', async () => {
    const res = await request(makeApp().app).get('/admin/companies?status=DRAFT').set(auth);
    expect(res.status).toBe(400);
  });
});

describe('GET /admin/companies/:id', () => {
  it('404 for an unknown company', async () => {
    const { app, prisma } = makeApp();
    prisma.company.findUnique.mockResolvedValue(null);
    const res = await request(app).get(`/admin/companies/${ID}`).set(auth);
    expect(res.status).toBe(404);
  });
});

describe('POST /admin/companies/:id/approve and /reject', () => {
  let ctx: ReturnType<typeof makeApp>;
  beforeEach(() => {
    ctx = makeApp();
  });

  it('approves a pending company and records the reviewer', async () => {
    ctx.prisma.company.updateMany.mockResolvedValue({ count: 1 });
    ctx.prisma.company.findUnique.mockResolvedValue(row({ moderationStatus: 'APPROVED' }));
    const res = await request(ctx.app).post(`/admin/companies/${ID}/approve`).set(auth);
    expect(res.status).toBe(200);
    expect(res.body.moderationStatus).toBe('APPROVED');
    expect(ctx.prisma.company.updateMany).toHaveBeenCalledWith({
      where: { id: ID, moderationStatus: 'PENDING' },
      data: {
        moderationStatus: 'APPROVED',
        moderationReason: null,
        reviewedById: ADMIN_ID,
        reviewedAt: expect.any(Date),
      },
    });
  });

  it('rejects a pending company with the reason', async () => {
    ctx.prisma.company.updateMany.mockResolvedValue({ count: 1 });
    ctx.prisma.company.findUnique.mockResolvedValue(
      row({ moderationStatus: 'REJECTED', moderationReason: 'No licence' }),
    );
    const res = await request(ctx.app)
      .post(`/admin/companies/${ID}/reject`)
      .set(auth)
      .send({ reason: ' No licence ' });
    expect(res.status).toBe(200);
    expect(res.body.moderationReason).toBe('No licence');
    expect(ctx.prisma.company.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ moderationStatus: 'REJECTED', moderationReason: 'No licence' }),
      }),
    );
  });

  it('400 when the reason is blank (E2)', async () => {
    const res = await request(ctx.app)
      .post(`/admin/companies/${ID}/reject`)
      .set(auth)
      .send({ reason: '   ' });
    expect(res.status).toBe(400);
    expect(ctx.prisma.company.updateMany).not.toHaveBeenCalled();
  });

  it('409 with the current status when the company was already decided (E1)', async () => {
    ctx.prisma.company.updateMany.mockResolvedValue({ count: 0 });
    ctx.prisma.company.findUnique.mockResolvedValue(row({ moderationStatus: 'APPROVED' }));
    const res = await request(ctx.app).post(`/admin/companies/${ID}/approve`).set(auth);
    expect(res.status).toBe(409);
    const body = apiErrorSchema.parse(res.body);
    expect(body.error.code).toBe('CONFLICT');
    expect(body.error.message).toContain('APPROVED');
  });

  it('404 when deciding on an unknown company', async () => {
    ctx.prisma.company.updateMany.mockResolvedValue({ count: 0 });
    ctx.prisma.company.findUnique.mockResolvedValue(null);
    const res = await request(ctx.app).post(`/admin/companies/${ID}/approve`).set(auth);
    expect(res.status).toBe(404);
  });
});
