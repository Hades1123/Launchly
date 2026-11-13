/* eslint-disable @typescript-eslint/no-explicit-any */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { candidateApplicationDetailSchema, candidateApplicationListSchema } from '@launchly/shared';
import { errorHandler } from '@/middlewares/error-handler';
import { createApplicationRouter } from '@/modules/application/application.routes';
import { createApplicationService } from '@/modules/application/application.service';
import type { createAuthService } from '@/modules/auth/auth.service';
import type { PrismaClient } from '@/generated/prisma/client';

const APP_ID = '44444444-4444-4444-8444-444444444444';
const auth = { Authorization: 'Bearer token' };

const listRow = (id: string, createdAt: string) => ({
  id,
  jobId: 'job-1',
  status: 'SCREENING',
  createdAt: new Date(createdAt),
  updatedAt: new Date('2026-11-12T10:00:00Z'),
  job: { title: 'Backend Intern', company: { name: 'Acme' } },
  currentStage: { name: 'Screening' },
});

const detailRow = () => ({
  ...listRow(APP_ID, '2026-11-10T00:00:00Z'),
  resumeId: 'resume-1',
  coverLetter: 'Hello',
  statusHistory: [
    {
      fromStatus: null,
      toStatus: 'SUBMITTED',
      note: null,
      changedAt: new Date('2026-11-10T00:00:00Z'),
    },
    {
      fromStatus: 'SUBMITTED',
      toStatus: 'SCREENING',
      note: 'Looks good',
      changedAt: new Date('2026-11-11T00:00:00Z'),
    },
  ],
  job: {
    title: 'Backend Intern',
    company: { name: 'Acme' },
    stages: [
      { id: 's1', name: 'Screening', position: 1 },
      { id: 's2', name: 'Interview', position: 2 },
    ],
  },
});

function makeApp(role: 'CANDIDATE' | 'RECRUITER' = 'CANDIDATE') {
  const prisma = {
    candidateProfile: {
      findUnique: vi.fn<(args: any) => Promise<any>>(async () => ({ id: 'profile-1' })),
    },
    application: {
      findMany: vi.fn<(args: any) => Promise<any>>(async () => []),
      findFirst: vi.fn<(args: any) => Promise<any>>(async () => null),
    },
  };
  const authService = {
    verifyAccessToken: vi.fn(() => ({ userId: 'user-1', sessionId: 's' })),
    getSessionUser: vi.fn(async () => ({ id: 'user-1', role })),
  } as unknown as ReturnType<typeof createAuthService>;
  const app = express();
  app.use(express.json());
  app.use(
    '/applications',
    createApplicationRouter(
      authService,
      createApplicationService(prisma as unknown as PrismaClient),
    ),
  );
  app.use(errorHandler);
  return { app, prisma };
}

describe('GET /applications/me', () => {
  let ctx: ReturnType<typeof makeApp>;
  beforeEach(() => {
    ctx = makeApp();
  });

  it("lists only the caller's applications, newest first", async () => {
    ctx.prisma.application.findMany.mockResolvedValue([
      listRow('a2', '2026-11-12T00:00:00Z'),
      listRow('a1', '2026-11-10T00:00:00Z'),
    ]);
    const res = await request(ctx.app).get('/applications/me').set(auth);

    expect(res.status).toBe(200);
    expect(candidateApplicationListSchema.safeParse(res.body).success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0]).toEqual({
      id: 'a2',
      jobId: 'job-1',
      jobTitle: 'Backend Intern',
      companyName: 'Acme',
      status: 'SCREENING',
      currentStageName: 'Screening',
      submittedAt: '2026-11-12T00:00:00.000Z',
      updatedAt: '2026-11-12T10:00:00.000Z',
    });
    const args = ctx.prisma.application.findMany.mock.calls[0]![0];
    expect(args.where).toEqual({ candidateId: 'profile-1' });
    expect(args.orderBy).toEqual({ createdAt: 'desc' });
  });

  it('returns an empty list when the caller has no profile yet', async () => {
    ctx.prisma.candidateProfile.findUnique.mockResolvedValue(null);
    const res = await request(ctx.app).get('/applications/me').set(auth);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [] });
    expect(ctx.prisma.application.findMany).not.toHaveBeenCalled();
  });

  it('is forbidden for a recruiter and needs a session', async () => {
    const recruiter = makeApp('RECRUITER');
    expect((await request(recruiter.app).get('/applications/me').set(auth)).status).toBe(403);
    expect((await request(ctx.app).get('/applications/me')).status).toBe(401);
  });
});

describe('GET /applications/:id', () => {
  let ctx: ReturnType<typeof makeApp>;
  beforeEach(() => {
    ctx = makeApp();
  });

  it("returns 404 for another candidate's application", async () => {
    // The query is scoped to the caller, so a foreign id finds nothing.
    ctx.prisma.application.findFirst.mockResolvedValue(null);
    const res = await request(ctx.app).get(`/applications/${APP_ID}`).set(auth);

    expect(res.status).toBe(404);
    expect(ctx.prisma.application.findFirst.mock.calls[0]![0].where).toEqual({
      id: APP_ID,
      candidateId: 'profile-1',
    });
  });

  it('returns 404 when the caller has no candidate profile', async () => {
    ctx.prisma.candidateProfile.findUnique.mockResolvedValue(null);
    const res = await request(ctx.app).get(`/applications/${APP_ID}`).set(auth);

    expect(res.status).toBe(404);
  });

  it('returns the history ordered by changedAt and the job stages', async () => {
    ctx.prisma.application.findFirst.mockResolvedValue(detailRow());
    const res = await request(ctx.app).get(`/applications/${APP_ID}`).set(auth);

    expect(res.status).toBe(200);
    expect(candidateApplicationDetailSchema.safeParse(res.body).success).toBe(true);
    expect(res.body.history.map((h: { toStatus: string }) => h.toStatus)).toEqual([
      'SUBMITTED',
      'SCREENING',
    ]);
    expect(res.body.history[1]).toEqual({
      fromStatus: 'SUBMITTED',
      toStatus: 'SCREENING',
      note: 'Looks good',
      changedAt: '2026-11-11T00:00:00.000Z',
    });
    expect(res.body.stages).toEqual([
      { id: 's1', name: 'Screening', position: 1 },
      { id: 's2', name: 'Interview', position: 2 },
    ]);
    const select = ctx.prisma.application.findFirst.mock.calls[0]![0].select;
    expect(select.statusHistory.orderBy).toEqual([{ changedAt: 'asc' }, { id: 'asc' }]);
    expect(select.job.select.stages.orderBy).toEqual({ position: 'asc' });
  });

  it('rejects a malformed id with 400 and a recruiter with 403', async () => {
    expect((await request(ctx.app).get('/applications/not-a-uuid').set(auth)).status).toBe(400);
    const recruiter = makeApp('RECRUITER');
    expect((await request(recruiter.app).get(`/applications/${APP_ID}`).set(auth)).status).toBe(
      403,
    );
  });
});
