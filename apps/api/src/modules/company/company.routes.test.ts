import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiErrorSchema } from '@launchly/shared';
import { errorHandler } from '@/middlewares/error-handler';
import { createCompanyRouter } from '@/modules/company/company.routes';
import { createCompanyService } from '@/modules/company/company.service';
import type { createAuthService } from '@/modules/auth/auth.service';
import type { PrismaClient } from '@/generated/prisma/client';

const COMPANY_ID = '11111111-1111-4111-8111-111111111111';
const row = {
  id: COMPANY_ID,
  name: 'Acme',
  address: 'HCMC',
  industry: null,
  companySize: null,
  website: null,
  logoUrl: null,
  description: null,
  moderationStatus: 'PENDING' as const,
  createdAt: new Date('2026-11-07T00:00:00Z'),
};

function makeApp(role: 'RECRUITER' | 'CANDIDATE' = 'RECRUITER') {
  const prisma = {
    company: { findFirst: vi.fn(), create: vi.fn() },
  };
  const authService = {
    verifyAccessToken: vi.fn(() => ({ userId: 'user-1', sessionId: 'session-1' })),
    getSessionUser: vi.fn(async () => ({ id: 'user-1', role })),
  } as unknown as ReturnType<typeof createAuthService>;
  const app = express();
  app.use(express.json());
  app.use(
    '/companies',
    createCompanyRouter(authService, createCompanyService(prisma as unknown as PrismaClient)),
  );
  app.use(errorHandler);
  return { app, prisma };
}

const auth = { Authorization: 'Bearer token' };

describe('POST /companies', () => {
  let ctx: ReturnType<typeof makeApp>;
  beforeEach(() => {
    ctx = makeApp();
  });

  it('401 without token', async () => {
    const res = await request(ctx.app).post('/companies').send({ name: 'A', address: 'B' });
    expect(res.status).toBe(401);
    apiErrorSchema.parse(res.body);
  });

  it('403 for non-recruiter', async () => {
    const { app } = makeApp('CANDIDATE');
    const res = await request(app).post('/companies').set(auth).send({ name: 'A', address: 'B' });
    expect(res.status).toBe(403);
  });

  it('400 when name/address missing', async () => {
    const res = await request(ctx.app).post('/companies').set(auth).send({ name: ' ' });
    expect(res.status).toBe(400);
    expect(apiErrorSchema.parse(res.body).error.code).toBe('VALIDATION_ERROR');
  });

  it('409 when owner already has a company', async () => {
    ctx.prisma.company.findFirst.mockResolvedValue({ id: COMPANY_ID });
    const res = await request(ctx.app).post('/companies').set(auth).send({ name: 'A', address: 'B' });
    expect(res.status).toBe(409);
    expect(apiErrorSchema.parse(res.body).error.code).toBe('CONFLICT');
  });

  it('201 creates PENDING company owned by caller', async () => {
    ctx.prisma.company.findFirst.mockResolvedValue(null);
    ctx.prisma.company.create.mockResolvedValue(row);
    const res = await request(ctx.app)
      .post('/companies')
      .set(auth)
      .send({ name: ' Acme ', address: 'HCMC' });
    expect(res.status).toBe(201);
    expect(res.body.moderationStatus).toBe('PENDING');
    expect(ctx.prisma.company.create.mock.calls[0]![0].data).toMatchObject({
      ownerId: 'user-1',
      name: 'Acme',
    });
  });
});

describe('GET /companies/me and /companies/:id', () => {
  it('me returns 404 when none', async () => {
    const { app, prisma } = makeApp();
    prisma.company.findFirst.mockResolvedValue(null);
    const res = await request(app).get('/companies/me').set(auth);
    expect(res.status).toBe(404);
  });

  it('me returns own company', async () => {
    const { app, prisma } = makeApp();
    prisma.company.findFirst.mockResolvedValue(row);
    const res = await request(app).get('/companies/me').set(auth);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(COMPANY_ID);
  });

  it('public rejects non-uuid id', async () => {
    const { app } = makeApp();
    expect((await request(app).get('/companies/nope')).status).toBe(400);
  });

  it('public only queries APPROVED companies; 404 otherwise', async () => {
    const { app, prisma } = makeApp();
    prisma.company.findFirst.mockResolvedValue(null);
    const res = await request(app).get(`/companies/${COMPANY_ID}`);
    expect(res.status).toBe(404);
    expect(prisma.company.findFirst.mock.calls[0]![0].where).toEqual({
      id: COMPANY_ID,
      moderationStatus: 'APPROVED',
    });
  });

  it('public returns approved company without auth', async () => {
    const { app, prisma } = makeApp();
    prisma.company.findFirst.mockResolvedValue({ ...row, moderationStatus: 'APPROVED' });
    const res = await request(app).get(`/companies/${COMPANY_ID}`);
    expect(res.status).toBe(200);
  });
});
