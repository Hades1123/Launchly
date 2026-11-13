import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { adminJobSchema, apiErrorSchema } from '@launchly/shared';
import { createApp } from '@/app';
import type { PrismaClient } from '@/generated/prisma/client';
import { errorHandler } from '@/middlewares/error-handler';
import type { createAuthService } from '@/modules/auth/auth.service';
import { createAdminJobRouter } from '@/modules/admin/admin-job.routes';
import { createAdminJobService } from '@/modules/admin/admin-job.service';
import type { MailProvider } from '@/providers/mail/mail-provider';

const ID = '22222222-2222-4222-8222-222222222222';
const ADMIN_ID = 'admin-1';
const NOW = new Date('2026-11-13T00:00:00Z');

const row = (overrides: Record<string, unknown> = {}) => ({
  id: ID,
  title: 'Backend intern',
  description: 'Build APIs',
  level: 'INTERN',
  location: 'HCMC',
  industry: null,
  requirements: [],
  benefits: [],
  salaryMin: null,
  salaryMax: null,
  salaryHidden: false,
  publicationStatus: 'PENDING',
  moderationReason: null,
  createdAt: NOW,
  updatedAt: NOW,
  stages: [
    {
      id: '33333333-3333-4333-8333-333333333331',
      name: 'CV screen',
      format: 'ONLINE',
      estimatedDurationMinutes: 15,
      position: 1,
    },
    {
      id: '33333333-3333-4333-8333-333333333332',
      name: 'Interview',
      format: 'ONSITE',
      estimatedDurationMinutes: 60,
      position: 2,
    },
  ],
  notes: [{ id: 'n1', content: 'Bring a laptop', position: 1 }],
  reviewedAt: null,
  company: { name: 'Acme' },
  createdBy: { email: 'hr@acme.test' },
  ...overrides,
});

const notPending = Object.assign(new Error('No record found'), { code: 'P2025' });

function makeApp(role: 'ADMIN' | 'RECRUITER' = 'ADMIN') {
  const prisma = {
    job: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  };
  const mail = { send: vi.fn(async () => undefined) } satisfies MailProvider;
  const authService = {
    verifyAccessToken: vi.fn(() => ({ userId: ADMIN_ID, sessionId: 'session-1' })),
    getSessionUser: vi.fn(async () => ({ id: ADMIN_ID, role })),
  } as unknown as ReturnType<typeof createAuthService>;
  const app = express();
  app.use(express.json());
  app.use(
    '/admin/jobs',
    createAdminJobRouter(
      authService,
      createAdminJobService(prisma as unknown as PrismaClient, mail),
    ),
  );
  app.use(errorHandler);
  return { app, prisma, mail };
}

const auth = { Authorization: 'Bearer token' };

describe('admin job routes in the app', () => {
  it('are mounted at /admin/jobs behind authentication', async () => {
    const res = await request(createApp()).get('/admin/jobs');
    expect(res.status).toBe(401);
  });
});

describe('admin job access (E3)', () => {
  const routes = [
    ['get', '/admin/jobs'],
    ['get', `/admin/jobs/${ID}`],
    ['post', `/admin/jobs/${ID}/approve`],
    ['post', `/admin/jobs/${ID}/reject`],
  ] as const;

  it.each(routes)('%s %s is 401 without a token', async (method, path) => {
    const res = await request(makeApp().app)[method](path).send({ reason: 'x' });
    expect(res.status).toBe(401);
    apiErrorSchema.parse(res.body);
  });

  it.each(routes)('%s %s is 403 for a recruiter', async (method, path) => {
    const agent = request(makeApp('RECRUITER').app);
    const res = await agent[method](path).set(auth).send({ reason: 'x' });
    expect(res.status).toBe(403);
  });
});

describe('GET /admin/jobs', () => {
  it('lists pending jobs, oldest submission first, with company, creator, rounds and notes', async () => {
    const { app, prisma } = makeApp();
    prisma.job.findMany.mockResolvedValue([row()]);
    const res = await request(app).get('/admin/jobs').set(auth);
    expect(res.status).toBe(200);
    expect(prisma.job.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { publicationStatus: 'PENDING' },
        // Same timestamp → id, so the queue order never jumps between calls.
        orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
      }),
    );
    const job = adminJobSchema.parse(res.body[0]);
    expect(job).toMatchObject({ companyName: 'Acme', creatorEmail: 'hr@acme.test' });
    expect(job.rounds.map((r) => r.name)).toEqual(['CV screen', 'Interview']);
    expect(job.notes.map((n) => n.content)).toEqual(['Bring a laptop']);
  });

  it('400 for a status admins do not review', async () => {
    const res = await request(makeApp().app).get('/admin/jobs?status=DRAFT').set(auth);
    expect(res.status).toBe(400);
  });
});

describe('GET /admin/jobs/:id', () => {
  it('returns one job', async () => {
    const { app, prisma } = makeApp();
    prisma.job.findUnique.mockResolvedValue(row());
    const res = await request(app).get(`/admin/jobs/${ID}`).set(auth);
    expect(res.status).toBe(200);
    expect(adminJobSchema.parse(res.body).id).toBe(ID);
  });

  it('404 for an unknown job', async () => {
    const { app, prisma } = makeApp();
    prisma.job.findUnique.mockResolvedValue(null);
    const res = await request(app).get(`/admin/jobs/${ID}`).set(auth);
    expect(res.status).toBe(404);
  });
});

describe('POST /admin/jobs/:id/approve and /reject', () => {
  let ctx: ReturnType<typeof makeApp>;
  beforeEach(() => {
    ctx = makeApp();
  });

  it('publishes a pending job in one conditional update and records the reviewer', async () => {
    ctx.prisma.job.update.mockResolvedValue(row({ publicationStatus: 'PUBLISHED' }));
    const res = await request(ctx.app).post(`/admin/jobs/${ID}/approve`).set(auth);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PUBLISHED');
    expect(ctx.prisma.job.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ID, publicationStatus: 'PENDING' },
        data: {
          publicationStatus: 'PUBLISHED',
          moderationReason: null,
          reviewedById: ADMIN_ID,
          reviewedAt: expect.any(Date),
        },
      }),
    );
  });

  it('rejects a pending job with the trimmed reason', async () => {
    ctx.prisma.job.update.mockResolvedValue(
      row({ publicationStatus: 'REJECTED', moderationReason: 'Not entry level' }),
    );
    const res = await request(ctx.app)
      .post(`/admin/jobs/${ID}/reject`)
      .set(auth)
      .send({ reason: ' Not entry level ' });
    expect(res.status).toBe(200);
    expect(res.body.moderationReason).toBe('Not entry level');
    expect(ctx.prisma.job.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          publicationStatus: 'REJECTED',
          moderationReason: 'Not entry level',
        }),
      }),
    );
  });

  it('400 when the reason is blank (E2)', async () => {
    const res = await request(ctx.app)
      .post(`/admin/jobs/${ID}/reject`)
      .set(auth)
      .send({ reason: '   ' });
    expect(res.status).toBe(400);
    expect(ctx.prisma.job.update).not.toHaveBeenCalled();
  });

  it('409 with the current status when the job was already decided (E1)', async () => {
    ctx.prisma.job.update.mockRejectedValue(notPending);
    ctx.prisma.job.findUnique.mockResolvedValue({ publicationStatus: 'PUBLISHED' });
    const res = await request(ctx.app).post(`/admin/jobs/${ID}/approve`).set(auth);
    expect(res.status).toBe(409);
    const body = apiErrorSchema.parse(res.body);
    expect(body.error.code).toBe('CONFLICT');
    expect(body.error.message).toContain('PUBLISHED');
  });

  it('404 when deciding on an unknown job', async () => {
    ctx.prisma.job.update.mockRejectedValue(notPending);
    ctx.prisma.job.findUnique.mockResolvedValue(null);
    const res = await request(ctx.app).post(`/admin/jobs/${ID}/approve`).set(auth);
    expect(res.status).toBe(404);
  });

  it('passes other database errors through as 500', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    ctx.prisma.job.update.mockRejectedValue(new Error('connection lost'));
    const res = await request(ctx.app).post(`/admin/jobs/${ID}/approve`).set(auth);
    expect(res.status).toBe(500);
    log.mockRestore();
  });
});

describe('outcome email to the job creator (US2)', () => {
  let ctx: ReturnType<typeof makeApp>;
  beforeEach(() => {
    ctx = makeApp();
  });

  it('emails the creator once when a job is published (FR-009)', async () => {
    ctx.prisma.job.update.mockResolvedValue(row({ publicationStatus: 'PUBLISHED' }));
    await request(ctx.app).post(`/admin/jobs/${ID}/approve`).set(auth).expect(200);
    await vi.waitFor(() => expect(ctx.mail.send).toHaveBeenCalledTimes(1));
    expect(ctx.mail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'hr@acme.test',
        subject: expect.stringContaining('Backend intern'),
      }),
    );
  });

  it('emails the creator the reason when a job is rejected (FR-009)', async () => {
    ctx.prisma.job.update.mockResolvedValue(
      row({ publicationStatus: 'REJECTED', moderationReason: 'Not entry level' }),
    );
    await request(ctx.app)
      .post(`/admin/jobs/${ID}/reject`)
      .set(auth)
      .send({ reason: 'Not entry level' })
      .expect(200);
    await vi.waitFor(() => expect(ctx.mail.send).toHaveBeenCalledTimes(1));
    expect(ctx.mail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'hr@acme.test',
        text: expect.stringContaining('Not entry level'),
      }),
    );
  });

  it('keeps the decision and logs a fixed message when the email fails (FR-010, E6)', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    ctx.mail.send.mockRejectedValueOnce(new Error('550 hr@acme.test rejected'));
    ctx.prisma.job.update.mockResolvedValue(row({ publicationStatus: 'PUBLISHED' }));
    const res = await request(ctx.app).post(`/admin/jobs/${ID}/approve`).set(auth);
    expect(res.status).toBe(200);
    await vi.waitFor(() => expect(log).toHaveBeenCalledWith('Job moderation email failed'));
    log.mockRestore();
  });

  it('sends no email when the decision is refused', async () => {
    ctx.prisma.job.update.mockRejectedValue(notPending);
    ctx.prisma.job.findUnique.mockResolvedValue({ publicationStatus: 'PUBLISHED' });
    await request(ctx.app).post(`/admin/jobs/${ID}/approve`).set(auth).expect(409);
    expect(ctx.mail.send).not.toHaveBeenCalled();
  });
});
