/* eslint-disable @typescript-eslint/no-explicit-any */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://launchly:launchly@localhost:5433/launchly';
process.env.JWT_SECRET = 'change-me-at-least-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'change-me-too-at-least-32-characters';

import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  apiErrorSchema,
  practiceHistoryResponseSchema,
  practiceSessionDtoSchema,
} from '@launchly/shared';
import { errorHandler } from '@/middlewares/error-handler';
import type { createAuthService } from '@/modules/auth/auth.service';
import { createInterviewPracticeRouter } from '@/modules/interview-practice/interview-practice.routes';
import { createInterviewPracticeService } from '@/modules/interview-practice/interview-practice.service';
import type { PrismaClient } from '@/generated/prisma/client';

const NOW = new Date('2026-11-13T10:00:00.000Z');
const IN_24H = new Date('2026-11-14T10:00:00.000Z');
const JOB = '11111111-1111-4111-8111-111111111111';
const SESSION = '33333333-3333-4333-8333-333333333333';
const ONLINE = '44444444-4444-4444-8444-444444444441';
const ONSITE = '44444444-4444-4444-8444-444444444442';
const PHONE = '44444444-4444-4444-8444-444444444443';
const auth = { Authorization: 'Bearer token' };
const BASE = '/candidates/me/interview-practice';

const stages = [
  { id: ONLINE, name: 'Online test', format: 'ONLINE', position: 1 },
  { id: ONSITE, name: 'On-site day', format: 'ONSITE', position: 2 },
  { id: PHONE, name: 'Phone screen', format: 'PHONE', position: 3 },
];

const publishedJob = (over: Record<string, unknown> = {}) => ({
  id: JOB,
  title: 'Frontend Intern',
  description: 'Build UI with React.',
  stages,
  ...over,
});

function sessionRow(over: Record<string, unknown> = {}) {
  return {
    id: SESSION,
    jobId: JOB,
    applicationId: null,
    candidateId: 'profile-1',
    scope: 'FULL',
    status: 'IN_PROGRESS',
    interviewConsentAt: NOW,
    lastActivityAt: NOW,
    expiresAt: IN_24H,
    summary: null,
    createdAt: NOW,
    completedAt: null,
    job: { title: 'Frontend Intern' },
    rounds: [
      {
        id: '55555555-5555-4555-8555-555555555551',
        stageId: ONLINE,
        name: 'Online test',
        position: 1,
        status: 'IN_PROGRESS',
        feedback: null,
        questions: [
          {
            id: '66666666-6666-4666-8666-666666666661',
            position: 1,
            prompt: 'Tell me about a project',
            source: 'JOB_DESCRIPTION',
            answer: { answer: 'A table', feedback: null, score: null },
          },
        ],
      },
    ],
    ...over,
  };
}

function makeApp(role: 'CANDIDATE' | 'RECRUITER' = 'CANDIDATE') {
  const prisma = {
    candidateProfile: {
      findUnique: vi.fn<(args: any) => Promise<any>>(async () => ({ id: 'profile-1' })),
    },
    job: { findFirst: vi.fn<(args: any) => Promise<any>>(async () => publishedJob()) },
    application: { findUnique: vi.fn<(args: any) => Promise<any>>(async () => null) },
    interviewSession: {
      findFirst: vi.fn<(args: any) => Promise<any>>(async () => null),
      create: vi.fn<(args: any) => Promise<any>>(async () => sessionRow()),
      update: vi.fn<(args: any) => Promise<any>>(async () => sessionRow()),
      findMany: vi.fn<(args: any) => Promise<any>>(async () => []),
      count: vi.fn<(args: any) => Promise<number>>(async () => 0),
    },
  };
  const authService = {
    verifyAccessToken: vi.fn(() => ({ userId: 'user-1', sessionId: 's' })),
    getSessionUser: vi.fn(async () => ({ id: 'user-1', role })),
  } as unknown as ReturnType<typeof createAuthService>;
  const service = createInterviewPracticeService(prisma as unknown as PrismaClient, {
    now: () => NOW,
  });
  const app = express();
  app.use(express.json());
  app.use(BASE, createInterviewPracticeRouter(authService, service));
  app.use(errorHandler);
  return { app, prisma };
}

const start = (ctx: ReturnType<typeof makeApp>, body: unknown) =>
  request(ctx.app)
    .post(BASE)
    .set(auth)
    .send(body as object);

describe('POST /candidates/me/interview-practice', () => {
  let ctx: ReturnType<typeof makeApp>;
  beforeEach(() => {
    ctx = makeApp();
  });

  it('starts a full-workflow session without an application (201)', async () => {
    const res = await start(ctx, { jobId: JOB, consent: true });

    expect(res.status).toBe(201);
    expect(practiceSessionDtoSchema.safeParse(res.body).success).toBe(true);
    const data = ctx.prisma.interviewSession.create.mock.calls[0]![0].data;
    expect(data).toMatchObject({
      candidateId: 'profile-1',
      jobId: JOB,
      applicationId: null,
      scope: 'FULL',
      status: 'IN_PROGRESS',
      interviewConsentAt: NOW,
      lastActivityAt: NOW,
      expiresAt: IN_24H,
    });
    // Only the ONLINE and PHONE rounds are practiced, in the job's order.
    expect(data.rounds.create).toEqual([
      expect.objectContaining({ stageId: ONLINE, name: 'Online test', position: 1 }),
      expect.objectContaining({ stageId: PHONE, name: 'Phone screen', position: 2 }),
    ]);
  });

  it('links the application when the candidate already applied', async () => {
    ctx.prisma.application.findUnique.mockResolvedValue({ id: 'app-1' });

    const res = await start(ctx, { jobId: JOB, consent: true });

    expect(res.status).toBe(201);
    expect(ctx.prisma.application.findUnique.mock.calls[0]![0].where).toEqual({
      candidateId_jobId: { candidateId: 'profile-1', jobId: JOB },
    });
    expect(ctx.prisma.interviewSession.create.mock.calls[0]![0].data.applicationId).toBe('app-1');
  });

  it('starts a single interactive round', async () => {
    const res = await start(ctx, { jobId: JOB, consent: true, stageId: PHONE });

    expect(res.status).toBe(201);
    const data = ctx.prisma.interviewSession.create.mock.calls[0]![0].data;
    expect(data.scope).toBe('ROUND');
    expect(data.rounds.create).toEqual([
      expect.objectContaining({ stageId: PHONE, name: 'Phone screen', position: 1 }),
    ]);
  });

  it('rejects a start without consent and creates no session', async () => {
    for (const body of [{ jobId: JOB }, { jobId: JOB, consent: false }]) {
      const res = await start(ctx, body);
      expect(res.status).toBe(400);
      expect(apiErrorSchema.safeParse(res.body).success).toBe(true);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
    expect(ctx.prisma.interviewSession.create).not.toHaveBeenCalled();
    expect(ctx.prisma.job.findFirst).not.toHaveBeenCalled();
  });

  it('404 for a job that is not published', async () => {
    ctx.prisma.job.findFirst.mockResolvedValue(null);

    const res = await start(ctx, { jobId: JOB, consent: true });

    expect(res.status).toBe(404);
    expect(ctx.prisma.job.findFirst.mock.calls[0]![0].where).toMatchObject({
      id: JOB,
      publicationStatus: 'PUBLISHED',
    });
    expect(ctx.prisma.interviewSession.create).not.toHaveBeenCalled();
  });

  it('400 for a job without a description or without a hiring process', async () => {
    ctx.prisma.job.findFirst.mockResolvedValueOnce(publishedJob({ description: '   ' }));
    const blank = await start(ctx, { jobId: JOB, consent: true });
    ctx.prisma.job.findFirst.mockResolvedValueOnce(publishedJob({ stages: [] }));
    const noStages = await start(ctx, { jobId: JOB, consent: true });

    expect(blank.status).toBe(400);
    expect(noStages.status).toBe(400);
    expect(apiErrorSchema.safeParse(blank.body).success).toBe(true);
    expect(ctx.prisma.interviewSession.create).not.toHaveBeenCalled();
  });

  it('400 for an informational round and for a workflow with no interactive round', async () => {
    const onsite = await start(ctx, { jobId: JOB, consent: true, stageId: ONSITE });
    ctx.prisma.job.findFirst.mockResolvedValueOnce(
      publishedJob({ stages: [stages[1], { ...stages[0], format: null }] }),
    );
    const none = await start(ctx, { jobId: JOB, consent: true });

    expect(onsite.status).toBe(400);
    expect(none.status).toBe(400);
    expect(ctx.prisma.interviewSession.create).not.toHaveBeenCalled();
  });

  it('400 when the selected round does not belong to the job', async () => {
    const res = await start(ctx, {
      jobId: JOB,
      consent: true,
      stageId: '77777777-7777-4777-8777-777777777777',
    });

    expect(res.status).toBe(400);
    expect(ctx.prisma.interviewSession.create).not.toHaveBeenCalled();
  });

  it('returns the existing active session instead of a duplicate (200)', async () => {
    ctx.prisma.interviewSession.findFirst.mockResolvedValue(sessionRow());

    const res = await start(ctx, { jobId: JOB, consent: true });

    expect(res.status).toBe(200);
    expect(ctx.prisma.interviewSession.create).not.toHaveBeenCalled();
    expect(ctx.prisma.interviewSession.update.mock.calls[0]![0].data).toMatchObject({
      lastActivityAt: NOW,
      expiresAt: IN_24H,
    });
    const where = ctx.prisma.interviewSession.findFirst.mock.calls[0]![0].where;
    expect(where).toMatchObject({ candidateId: 'profile-1', jobId: JOB, scope: 'FULL' });
    expect(where.status).toEqual({ not: 'COMPLETED' });
    expect(where.expiresAt).toEqual({ gt: NOW });
  });

  it('401 without a token and 403 for a recruiter', async () => {
    const anonymous = await request(ctx.app).post(BASE).send({ jobId: JOB, consent: true });
    const recruiter = makeApp('RECRUITER');
    const forbidden = await start(recruiter, { jobId: JOB, consent: true });

    expect(anonymous.status).toBe(401);
    expect(forbidden.status).toBe(403);
    expect(apiErrorSchema.safeParse(forbidden.body).success).toBe(true);
    expect(recruiter.prisma.interviewSession.create).not.toHaveBeenCalled();
  });
});

describe('GET /candidates/me/interview-practice/:id', () => {
  let ctx: ReturnType<typeof makeApp>;
  beforeEach(() => {
    ctx = makeApp();
  });

  it('lets the owner resume saved progress and resets the 24 h clock', async () => {
    ctx.prisma.interviewSession.findFirst.mockResolvedValue(
      sessionRow({ expiresAt: new Date('2026-11-13T12:00:00.000Z') }),
    );

    const res = await request(ctx.app).get(`${BASE}/${SESSION}`).set(auth);

    expect(res.status).toBe(200);
    expect(practiceSessionDtoSchema.safeParse(res.body).success).toBe(true);
    expect(res.body.rounds[0].questions[0].answer.answer).toBe('A table');
    expect(ctx.prisma.interviewSession.findFirst.mock.calls[0]![0].where).toMatchObject({
      id: SESSION,
      candidateId: 'profile-1',
    });
    expect(ctx.prisma.interviewSession.update.mock.calls[0]![0]).toMatchObject({
      where: { id: SESSION },
      data: { lastActivityAt: NOW, expiresAt: IN_24H },
    });
  });

  it("404 for another candidate's session", async () => {
    ctx.prisma.interviewSession.findFirst.mockResolvedValue(null);

    const res = await request(ctx.app).get(`${BASE}/${SESSION}`).set(auth);

    expect(res.status).toBe(404);
    expect(apiErrorSchema.safeParse(res.body).success).toBe(true);
    expect(ctx.prisma.interviewSession.update).not.toHaveBeenCalled();
  });

  it('404 for an expired incomplete session, before any cleanup ran', async () => {
    ctx.prisma.interviewSession.findFirst.mockResolvedValue(
      sessionRow({ expiresAt: new Date('2026-11-13T09:59:59.000Z') }),
    );

    const res = await request(ctx.app).get(`${BASE}/${SESSION}`).set(auth);

    expect(res.status).toBe(404);
    expect(ctx.prisma.interviewSession.update).not.toHaveBeenCalled();
  });

  it('keeps a completed session readable and does not extend it', async () => {
    ctx.prisma.interviewSession.findFirst.mockResolvedValue(
      sessionRow({
        status: 'COMPLETED',
        expiresAt: new Date('2026-11-01T00:00:00.000Z'),
        completedAt: NOW,
      }),
    );

    const res = await request(ctx.app).get(`${BASE}/${SESSION}`).set(auth);

    expect(res.status).toBe(200);
    expect(ctx.prisma.interviewSession.update).not.toHaveBeenCalled();
  });

  it('400 for an id that is not a uuid', async () => {
    const res = await request(ctx.app).get(`${BASE}/not-a-uuid`).set(auth);

    expect(res.status).toBe(400);
  });
});

describe('GET /candidates/me/interview-practice (history)', () => {
  let ctx: ReturnType<typeof makeApp>;
  beforeEach(() => {
    ctx = makeApp();
  });

  it('is newest-first, paginated, own data only and carries no answer bodies', async () => {
    ctx.prisma.interviewSession.count.mockResolvedValue(25);
    ctx.prisma.interviewSession.findMany.mockResolvedValue([
      { ...sessionRow(), _count: { rounds: 2 } },
    ]);

    const res = await request(ctx.app).get(`${BASE}?page=2&limit=10`).set(auth);

    expect(res.status).toBe(200);
    expect(practiceHistoryResponseSchema.safeParse(res.body).success).toBe(true);
    expect(res.body.pagination).toEqual({ page: 2, limit: 10, total: 25, totalPages: 3 });
    expect(res.body.data[0]).toMatchObject({
      id: SESSION,
      jobTitle: 'Frontend Intern',
      roundCount: 2,
    });
    expect(res.body.data[0]).not.toHaveProperty('rounds');
    expect(JSON.stringify(res.body)).not.toContain('A table');

    const args = ctx.prisma.interviewSession.findMany.mock.calls[0]![0];
    expect(args).toMatchObject({
      skip: 10,
      take: 10,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    expect(args.where.candidateId).toBe('profile-1');
    // Expired incomplete sessions are hidden even before the cleanup deletes them.
    expect(args.where.OR).toEqual([
      { status: 'COMPLETED' },
      { expiresAt: null },
      { expiresAt: { gt: NOW } },
    ]);
  });

  it('defaults to page 1 and limit 10, and returns an empty page', async () => {
    const res = await request(ctx.app).get(BASE).set(auth);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    });
    expect(ctx.prisma.interviewSession.findMany.mock.calls[0]![0]).toMatchObject({
      skip: 0,
      take: 10,
    });
  });

  it('400 for a limit above 50', async () => {
    const res = await request(ctx.app).get(`${BASE}?limit=51`).set(auth);

    expect(res.status).toBe(400);
    expect(ctx.prisma.interviewSession.findMany).not.toHaveBeenCalled();
  });
});
