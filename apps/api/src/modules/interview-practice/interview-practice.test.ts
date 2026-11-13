/* eslint-disable @typescript-eslint/no-explicit-any */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://launchly:launchly@localhost:5433/launchly';
process.env.JWT_SECRET = 'change-me-at-least-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'change-me-too-at-least-32-characters';

import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PRACTICE_FEEDBACK_DISCLAIMER,
  PRACTICE_QUESTIONS_PER_ROUND,
  apiErrorSchema,
  practiceHistoryResponseSchema,
  practiceSessionDtoSchema,
} from '@launchly/shared';
import { errorHandler } from '@/middlewares/error-handler';
import type { createAuthService } from '@/modules/auth/auth.service';
import { createInterviewPracticeRouter } from '@/modules/interview-practice/interview-practice.routes';
import { createInterviewPracticeService } from '@/modules/interview-practice/interview-practice.service';
import type { PrismaClient } from '@/generated/prisma/client';
import { AppError } from '@/lib/app-error';
import { MockAiProvider, type AiProvider } from '@/providers/ai';

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
            answer: { answer: 'A table', feedback: null },
          },
        ],
      },
    ],
    ...over,
  };
}

function makeApp(
  role: 'CANDIDATE' | 'RECRUITER' = 'CANDIDATE',
  ai?: AiProvider,
  timeoutMs?: number,
) {
  const prisma = {
    candidateProfile: {
      findUnique: vi.fn<(args: any) => Promise<any>>(async () => ({ id: 'profile-1' })),
    },
    job: { findFirst: vi.fn<(args: any) => Promise<any>>(async () => publishedJob()) },
    application: { findUnique: vi.fn<(args: any) => Promise<any>>(async () => null) },
    interviewSession: {
      findUnique: vi.fn<(args: any) => Promise<any>>(async () => sessionRow()),
      updateMany: vi.fn<(args: any) => Promise<any>>(async () => ({ count: 1 })),
      findFirst: vi.fn<(args: any) => Promise<any>>(async () => null),
      create: vi.fn<(args: any) => Promise<any>>(async () => sessionRow()),
      update: vi.fn<(args: any) => Promise<any>>(async () => sessionRow()),
      findMany: vi.fn<(args: any) => Promise<any>>(async () => []),
      count: vi.fn<(args: any) => Promise<number>>(async () => 0),
    },
    interviewPracticeRound: {
      findFirst: vi.fn<(args: any) => Promise<any>>(async () => null),
      findUnique: vi.fn<(args: any) => Promise<any>>(async () => ({ status: 'IN_PROGRESS' })),
      update: vi.fn<(args: any) => Promise<any>>(async () => ({})),
      updateMany: vi.fn<(args: any) => Promise<any>>(async () => ({ count: 1 })),
    },
    interviewPracticeQuestion: {
      findFirst: vi.fn<(args: any) => Promise<any>>(async () => null),
      count: vi.fn<(args: any) => Promise<number>>(async () => 0),
      createMany: vi.fn<(args: any) => Promise<any>>(async () => ({ count: 5 })),
    },
    interviewPracticeAnswer: {
      upsert: vi.fn<(args: any) => Promise<any>>(async () => ({})),
      update: vi.fn<(args: any) => Promise<any>>(async () => ({})),
    },
    $queryRaw: vi.fn<(...args: any[]) => Promise<any>>(async () => []),
  };
  const $transaction = vi.fn<(arg: any) => Promise<any>>(async (arg) =>
    typeof arg === 'function' ? arg(prisma) : Promise.all(arg),
  );
  Object.assign(prisma, { $transaction });
  const authService = {
    verifyAccessToken: vi.fn((token: string) => ({
      userId: token === 'other' ? 'user-2' : 'user-1',
      sessionId: 's',
    })),
    getSessionUser: vi.fn(async () => ({ id: 'user-1', role })),
  } as unknown as ReturnType<typeof createAuthService>;
  const service = createInterviewPracticeService(prisma as unknown as PrismaClient, {
    now: () => NOW,
    ...(ai && { ai }),
    ...(timeoutMs && { timeoutMs }),
  });
  const app = express();
  app.use(express.json());
  app.use(BASE, createInterviewPracticeRouter(authService, service));
  app.use(errorHandler);
  return { app, prisma: Object.assign(prisma, { $transaction }) };
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

  it('does not give a legacy session without an expiry a deadline', async () => {
    ctx.prisma.interviewSession.findFirst.mockResolvedValue(
      sessionRow({ expiresAt: null, interviewConsentAt: null }),
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

const ROUND = '55555555-5555-4555-8555-555555555551';
const QUESTION = '66666666-6666-4666-8666-666666666661';
const generated = {
  questions: Array.from({ length: PRACTICE_QUESTIONS_PER_ROUND }, (_, i) => ({
    prompt: `Question ${i + 1}?`,
    source: i < 2 ? 'JOB_DESCRIPTION' : i < 4 ? 'JOB_REQUIREMENTS' : 'ROUND_PROCESS',
  })),
};

function fakeAi(reply: unknown = generated) {
  const generateJson = vi.fn<(input: any) => Promise<any>>(async (input) =>
    input.schema.parse(reply),
  );
  return { ai: { generateJson } as unknown as AiProvider, generateJson };
}

function roundRow(over: Record<string, unknown> = {}) {
  return {
    id: ROUND,
    name: 'Online test',
    status: 'NOT_STARTED',
    stage: { format: 'ONLINE' },
    session: {
      id: SESSION,
      status: 'IN_PROGRESS',
      expiresAt: IN_24H,
      interviewConsentAt: NOW,
      job: {
        title: 'Frontend Intern',
        description: 'Build UI with React.',
        requirements: ['React'],
      },
    },
    _count: { questions: 0 },
    ...over,
  };
}

const sessionOf = (over: Record<string, unknown> = {}) => ({
  ...roundRow().session,
  ...over,
});

const generate = (ctx: ReturnType<typeof makeApp>, token = 'token') =>
  request(ctx.app)
    .post(`${BASE}/${SESSION}/rounds/${ROUND}/questions`)
    .set({ Authorization: `Bearer ${token}` });

describe('POST /:id/rounds/:roundId/questions', () => {
  let ai: ReturnType<typeof fakeAi>;
  let ctx: ReturnType<typeof makeApp>;
  beforeEach(() => {
    ai = fakeAi();
    ctx = makeApp('CANDIDATE', ai.ai);
    ctx.prisma.interviewPracticeRound.findFirst.mockResolvedValue(roundRow());
  });

  it('stores five questions with a source label each (201)', async () => {
    const res = await generate(ctx);

    expect(res.status).toBe(201);
    expect(practiceSessionDtoSchema.safeParse(res.body).success).toBe(true);
    expect(ctx.prisma.interviewPracticeQuestion.createMany.mock.calls[0]![0].data).toEqual(
      generated.questions.map((q, i) => ({
        roundId: ROUND,
        position: i + 1,
        prompt: q.prompt,
        source: q.source,
      })),
    );
    expect(ctx.prisma.interviewPracticeRound.update.mock.calls[0]![0]).toMatchObject({
      where: { id: ROUND },
      data: { status: 'IN_PROGRESS' },
    });
    // The round lookup is scoped to the signed-in candidate's own session.
    expect(ctx.prisma.interviewPracticeRound.findFirst.mock.calls[0]![0].where).toEqual({
      id: ROUND,
      sessionId: SESSION,
      session: { candidateId: 'profile-1' },
    });
  });

  it('builds the prompt from the job and the round only', async () => {
    await generate(ctx);

    const { prompt, system } = ai.generateJson.mock.calls[0]![0];
    expect(prompt).toContain('Frontend Intern');
    expect(prompt).toContain('Build UI with React.');
    expect(prompt).toContain('- React');
    expect(prompt).toContain('Online test');
    expect(prompt).toContain('ONLINE');
    expect(system).toMatch(/five/i);
  });

  it('a repeat returns the stored set with no AI call and no new rows (200)', async () => {
    ctx.prisma.interviewPracticeRound.findFirst.mockResolvedValue(
      roundRow({ _count: { questions: 5 } }),
    );

    const res = await generate(ctx);

    expect(res.status).toBe(200);
    expect(ai.generateJson).not.toHaveBeenCalled();
    expect(ctx.prisma.interviewPracticeQuestion.createMany).not.toHaveBeenCalled();
  });

  it('two requests racing store one set and leave saved answers alone', async () => {
    ctx.prisma.interviewPracticeQuestion.count.mockResolvedValue(5);

    const res = await generate(ctx);

    expect(res.status).toBe(200);
    expect(ctx.prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(ctx.prisma.interviewPracticeQuestion.createMany).not.toHaveBeenCalled();
    expect(ctx.prisma.interviewPracticeAnswer.upsert).not.toHaveBeenCalled();
  });

  it('stores nothing when the provider fails, and the retry succeeds', async () => {
    ai.generateJson.mockRejectedValueOnce(new AppError('AI_UNAVAILABLE', 'down'));

    const failed = await generate(ctx);

    expect(failed.status).toBe(503);
    expect(failed.body.error.code).toBe('AI_UNAVAILABLE');
    expect(ctx.prisma.$transaction).not.toHaveBeenCalled();
    expect(ctx.prisma.interviewPracticeQuestion.createMany).not.toHaveBeenCalled();

    const retry = await generate(ctx);
    expect(retry.status).toBe(201);
    expect(ctx.prisma.interviewPracticeQuestion.createMany).toHaveBeenCalledTimes(1);
  });

  it('503 and nothing stored when the AI returns the wrong shape', async () => {
    const mock = new MockAiProvider({
      respond: () => ({ questions: generated.questions.slice(1) }),
    });
    ctx = makeApp('CANDIDATE', mock);
    ctx.prisma.interviewPracticeRound.findFirst.mockResolvedValue(roundRow());

    const res = await generate(ctx);

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('AI_UNAVAILABLE');
    expect(ctx.prisma.interviewPracticeQuestion.createMany).not.toHaveBeenCalled();
  });

  it('503 for an unexpected provider error, without leaking its message', async () => {
    ai.generateJson.mockRejectedValueOnce(new Error('secret vendor detail'));

    const res = await generate(ctx);

    expect(res.status).toBe(503);
    expect(JSON.stringify(res.body)).not.toContain('secret vendor detail');
  });

  it('503 when the provider is slower than the timeout', async () => {
    const slow = { generateJson: vi.fn(() => new Promise(() => {})) } as unknown as AiProvider;
    ctx = makeApp('CANDIDATE', slow, 20);
    ctx.prisma.interviewPracticeRound.findFirst.mockResolvedValue(roundRow());

    const res = await generate(ctx);

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('AI_UNAVAILABLE');
    expect(ctx.prisma.interviewPracticeQuestion.createMany).not.toHaveBeenCalled();
  });

  it.each([
    [
      'a job without a description',
      { session: sessionOf({ job: { title: 'T', description: ' ', requirements: [] } }) },
      400,
    ],
    ['no interview consent', { session: sessionOf({ interviewConsentAt: null }) }, 403],
    ['an informational round', { stage: { format: 'ONSITE' } }, 400],
    ['a round whose stage was deleted', { stage: null }, 400],
    ['an expired session', { session: sessionOf({ expiresAt: NOW }) }, 404],
  ])('%s: no AI call, nothing stored', async (_label, over, status) => {
    ctx.prisma.interviewPracticeRound.findFirst.mockResolvedValue(roundRow(over));

    const res = await generate(ctx);

    expect(res.status).toBe(status);
    expect(apiErrorSchema.safeParse(res.body).success).toBe(true);
    expect(ai.generateJson).not.toHaveBeenCalled();
    expect(ctx.prisma.interviewPracticeQuestion.createMany).not.toHaveBeenCalled();
  });

  it('404 for a round of another candidate or an unknown round', async () => {
    ctx.prisma.interviewPracticeRound.findFirst.mockResolvedValue(null);

    const res = await generate(ctx);

    expect(res.status).toBe(404);
    expect(ai.generateJson).not.toHaveBeenCalled();
  });

  it('rejects recruiters, anonymous callers and bad ids', async () => {
    const recruiter = makeApp('RECRUITER', ai.ai);
    expect((await generate(recruiter)).status).toBe(403);
    expect(
      (await request(ctx.app).post(`${BASE}/${SESSION}/rounds/${ROUND}/questions`)).status,
    ).toBe(401);
    const bad = await request(ctx.app).post(`${BASE}/nope/rounds/${ROUND}/questions`).set(auth);
    expect(bad.status).toBe(400);
    expect(ai.generateJson).not.toHaveBeenCalled();
  });

  it('returns text questions only', async () => {
    const res = await generate(ctx);

    for (const round of res.body.rounds) {
      for (const question of round.questions) {
        expect(Object.keys(question).sort()).toEqual([
          'answer',
          'id',
          'position',
          'prompt',
          'source',
        ]);
      }
    }
  });

  it('answers 429 RATE_LIMITED from the 11th request in a minute, per candidate', async () => {
    ctx.prisma.interviewPracticeRound.findFirst.mockResolvedValue(
      roundRow({ _count: { questions: 5 } }),
    );

    for (let i = 0; i < 10; i++) expect((await generate(ctx)).status).toBe(200);
    const limited = await generate(ctx);

    expect(limited.status).toBe(429);
    expect(apiErrorSchema.safeParse(limited.body).success).toBe(true);
    expect(limited.body.error.code).toBe('RATE_LIMITED');
    // Another candidate has their own counter.
    expect((await generate(ctx, 'other')).status).toBe(200);
  });
});

const saveAnswer = (ctx: ReturnType<typeof makeApp>, body: unknown) =>
  request(ctx.app)
    .put(`${BASE}/${SESSION}/questions/${QUESTION}/answer`)
    .set(auth)
    .send(body as object);

const questionRow = (over: Record<string, unknown> = {}) => ({
  id: QUESTION,
  round: { id: ROUND, status: 'IN_PROGRESS', session: sessionOf() },
  ...over,
});

describe('PUT /:id/questions/:questionId/answer', () => {
  let ctx: ReturnType<typeof makeApp>;
  beforeEach(() => {
    ctx = makeApp();
    ctx.prisma.interviewPracticeQuestion.findFirst.mockResolvedValue(questionRow());
  });

  it('saves the trimmed answer, moves the 24 h clock and returns the session', async () => {
    const res = await saveAnswer(ctx, { answer: '  My answer  ' });

    expect(res.status).toBe(200);
    expect(practiceSessionDtoSchema.safeParse(res.body).success).toBe(true);
    expect(ctx.prisma.interviewPracticeAnswer.upsert.mock.calls[0]![0]).toEqual({
      where: { questionId: QUESTION },
      create: { questionId: QUESTION, answer: 'My answer' },
      update: { answer: 'My answer' },
    });
    expect(ctx.prisma.interviewSession.update.mock.calls[0]![0]).toMatchObject({
      where: { id: SESSION },
      data: { lastActivityAt: NOW, expiresAt: IN_24H },
    });
    expect(ctx.prisma.interviewPracticeQuestion.findFirst.mock.calls[0]![0].where).toEqual({
      id: QUESTION,
      round: { sessionId: SESSION, session: { candidateId: 'profile-1' } },
    });
  });

  it('starts a round that was not started yet', async () => {
    await saveAnswer(ctx, { answer: 'Hi' });

    expect(ctx.prisma.interviewPracticeRound.updateMany.mock.calls[0]![0]).toEqual({
      where: { id: ROUND, status: 'NOT_STARTED' },
      data: { status: 'IN_PROGRESS' },
    });
  });

  it.each([{}, { answer: '   ' }, { answer: 'x'.repeat(5001) }, { answer: 7 }])(
    '400 for the invalid body %j',
    async (body) => {
      const res = await saveAnswer(ctx, body);

      expect(res.status).toBe(400);
      expect(ctx.prisma.interviewPracticeAnswer.upsert).not.toHaveBeenCalled();
    },
  );

  it('409 once the round is completed, so feedback never goes stale', async () => {
    ctx.prisma.interviewPracticeQuestion.findFirst.mockResolvedValue(
      questionRow({ round: { id: ROUND, status: 'COMPLETED', session: sessionOf() } }),
    );

    const res = await saveAnswer(ctx, { answer: 'Late edit' });

    expect(res.status).toBe(409);
    expect(ctx.prisma.interviewPracticeAnswer.upsert).not.toHaveBeenCalled();
  });

  it('404 for another candidate or an expired session, 403 without consent', async () => {
    ctx.prisma.interviewPracticeQuestion.findFirst.mockResolvedValueOnce(null);
    expect((await saveAnswer(ctx, { answer: 'a' })).status).toBe(404);

    ctx.prisma.interviewPracticeQuestion.findFirst.mockResolvedValueOnce(
      questionRow({
        round: { id: ROUND, status: 'IN_PROGRESS', session: sessionOf({ expiresAt: NOW }) },
      }),
    );
    expect((await saveAnswer(ctx, { answer: 'a' })).status).toBe(404);

    ctx.prisma.interviewPracticeQuestion.findFirst.mockResolvedValueOnce(
      questionRow({
        round: {
          id: ROUND,
          status: 'IN_PROGRESS',
          session: sessionOf({ interviewConsentAt: null }),
        },
      }),
    );
    expect((await saveAnswer(ctx, { answer: 'a' })).status).toBe(403);
    expect(ctx.prisma.interviewPracticeAnswer.upsert).not.toHaveBeenCalled();
  });

  it('rejects recruiters', async () => {
    const res = await saveAnswer(makeApp('RECRUITER'), { answer: 'a' });
    expect(res.status).toBe(403);
  });
});

const feedbackBody = {
  overview: 'A clear start.',
  strengths: ['Structured answers'],
  improvements: ['Add concrete examples'],
};
const roundFeedback = { ...feedbackBody, answers: ['n1', 'n2', 'n3', 'n4', 'n5'] };
const summaryBody = { ...feedbackBody, nextSteps: ['Practice out loud'] };
const qid = (i: number) => `66666666-6666-4666-8666-66666666666${i}`;

const feedbackRound = (answered = 5, over: Record<string, unknown> = {}) =>
  roundRow({
    questions: Array.from({ length: 5 }, (_, i) => ({
      id: qid(i + 1),
      position: i + 1,
      prompt: `Question ${i + 1}?`,
      answer: i < answered ? { answer: `My answer ${i + 1}` } : null,
    })),
    ...over,
  });

const completedRound = (id: string, position: number) => ({
  id,
  stageId: position === 1 ? ONLINE : PHONE,
  name: position === 1 ? 'Online test' : 'Phone screen',
  position,
  status: 'COMPLETED',
  feedback: JSON.stringify(feedbackBody),
  questions: [],
});
const openRound = (id: string, position: number) => ({
  ...completedRound(id, position),
  status: 'IN_PROGRESS',
  feedback: null,
});
const ROUND2 = '55555555-5555-4555-8555-555555555552';

const feedback = (ctx: ReturnType<typeof makeApp>, token = 'token') =>
  request(ctx.app)
    .post(`${BASE}/${SESSION}/rounds/${ROUND}/feedback`)
    .set({ Authorization: `Bearer ${token}` });

/** An AI that answers the round-feedback call and then the summary call. */
function feedbackAi(
  replies: unknown[] = [roundFeedback, summaryBody],
  failAt?: { index: number; error: unknown },
) {
  let call = 0;
  const generateJson = vi.fn<(input: any) => Promise<any>>(async (input) => {
    const index = call++;
    if (failAt?.index === index) throw failAt.error;
    return input.schema.parse(replies[index]);
  });
  return { ai: { generateJson } as unknown as AiProvider, generateJson };
}

describe('POST /:id/rounds/:roundId/feedback', () => {
  let ai: ReturnType<typeof feedbackAi>;
  let ctx: ReturnType<typeof makeApp>;
  const setup = (a: ReturnType<typeof feedbackAi> = feedbackAi()) => {
    ai = a;
    ctx = makeApp('CANDIDATE', ai.ai);
    ctx.prisma.interviewPracticeRound.findFirst.mockResolvedValue(feedbackRound());
    // After the round is stored, another round of the session is still open.
    ctx.prisma.interviewSession.findUnique.mockResolvedValue(
      sessionRow({ rounds: [completedRound(ROUND, 1), openRound(ROUND2, 2)] }),
    );
  };
  beforeEach(() => setup());

  it('stores per-answer and round feedback and completes the round (201)', async () => {
    const res = await feedback(ctx);

    expect(res.status).toBe(201);
    expect(practiceSessionDtoSchema.safeParse(res.body).success).toBe(true);
    expect(ai.generateJson).toHaveBeenCalledTimes(1);
    const { prompt } = ai.generateJson.mock.calls[0]![0];
    expect(prompt).toContain('Frontend Intern');
    expect(prompt).toContain('Question 1?');
    expect(prompt).toContain('My answer 5');

    const updates = ctx.prisma.interviewPracticeAnswer.update.mock.calls.map((c) => c[0]);
    expect(updates).toEqual(
      [1, 2, 3, 4, 5].map((i) => ({ where: { questionId: qid(i) }, data: { feedback: `n${i}` } })),
    );
    expect(ctx.prisma.interviewPracticeRound.update.mock.calls[0]![0]).toEqual({
      where: { id: ROUND },
      data: { status: 'COMPLETED', feedback: JSON.stringify(feedbackBody) },
    });
  });

  it('keeps the summary away while a selected round is still open', async () => {
    const res = await feedback(ctx);

    expect(res.status).toBe(201);
    expect(ai.generateJson).toHaveBeenCalledTimes(1);
    expect(ctx.prisma.interviewSession.updateMany).not.toHaveBeenCalled();
    expect(res.body.summary).toBeNull();
  });

  it('writes the summary and completes the session when the last round completes', async () => {
    const done = sessionRow({
      status: 'COMPLETED',
      summary: JSON.stringify(summaryBody),
      rounds: [completedRound(ROUND, 1), completedRound(ROUND2, 2)],
    });
    ctx.prisma.interviewSession.findUnique
      .mockResolvedValueOnce(
        sessionRow({ rounds: [completedRound(ROUND, 1), completedRound(ROUND2, 2)] }),
      )
      .mockResolvedValueOnce(done);

    const res = await feedback(ctx);

    expect(res.status).toBe(201);
    expect(ai.generateJson).toHaveBeenCalledTimes(2);
    expect(ai.generateJson.mock.calls[1]![0].prompt).toContain('A clear start.');
    expect(ctx.prisma.interviewSession.updateMany.mock.calls[0]![0]).toEqual({
      where: { id: SESSION, status: { not: 'COMPLETED' } },
      data: { status: 'COMPLETED', completedAt: NOW, summary: JSON.stringify(summaryBody) },
    });
    expect(res.body.status).toBe('COMPLETED');
    expect(res.body.summary).toEqual({ ...summaryBody, disclaimer: PRACTICE_FEEDBACK_DISCLAIMER });
    expect(res.body.rounds[0].feedback).toEqual({
      ...feedbackBody,
      disclaimer: PRACTICE_FEEDBACK_DISCLAIMER,
    });
  });

  it('400 until all five answers are saved, with no AI call', async () => {
    for (const answered of [0, 4]) {
      ctx.prisma.interviewPracticeRound.findFirst.mockResolvedValueOnce(feedbackRound(answered));
      const res = await feedback(ctx);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
    ctx.prisma.interviewPracticeRound.findFirst.mockResolvedValueOnce(
      feedbackRound(5, { questions: [] }),
    );
    expect((await feedback(ctx)).status).toBe(400);
    expect(ai.generateJson).not.toHaveBeenCalled();
    expect(ctx.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('a repeat of a finished workflow returns the stored result with no AI call (200)', async () => {
    ctx.prisma.interviewPracticeRound.findFirst.mockResolvedValue(
      feedbackRound(5, { status: 'COMPLETED' }),
    );
    ctx.prisma.interviewSession.findUnique.mockResolvedValue(
      sessionRow({
        status: 'COMPLETED',
        summary: JSON.stringify(summaryBody),
        rounds: [completedRound(ROUND, 1)],
      }),
    );

    const res = await feedback(ctx);

    expect(res.status).toBe(200);
    expect(ai.generateJson).not.toHaveBeenCalled();
    expect(ctx.prisma.$transaction).not.toHaveBeenCalled();
    expect(ctx.prisma.interviewSession.updateMany).not.toHaveBeenCalled();
    expect(res.body.summary.disclaimer).toBe(PRACTICE_FEEDBACK_DISCLAIMER);
  });

  it('a retry after a failed summary writes only the summary', async () => {
    ctx.prisma.interviewPracticeRound.findFirst.mockResolvedValue(
      feedbackRound(5, { status: 'COMPLETED' }),
    );
    ctx.prisma.interviewSession.findUnique.mockResolvedValue(
      sessionRow({ rounds: [completedRound(ROUND, 1)] }),
    );
    setupAi([summaryBody]);

    const res = await feedback(ctx);

    expect(res.status).toBe(201);
    expect(ai.generateJson).toHaveBeenCalledTimes(1);
    expect(ctx.prisma.interviewPracticeAnswer.update).not.toHaveBeenCalled();
    expect(ctx.prisma.interviewSession.updateMany).toHaveBeenCalledTimes(1);

    function setupAi(replies: unknown[]) {
      ai = feedbackAi(replies);
      const next = makeApp('CANDIDATE', ai.ai);
      next.prisma.interviewPracticeRound.findFirst.mockResolvedValue(
        feedbackRound(5, { status: 'COMPLETED' }),
      );
      next.prisma.interviewSession.findUnique.mockResolvedValue(
        sessionRow({ rounds: [completedRound(ROUND, 1)] }),
      );
      ctx = next;
    }
  });

  it('a request that lost the race to complete the round changes nothing', async () => {
    ctx.prisma.interviewPracticeRound.findUnique.mockResolvedValue({ status: 'COMPLETED' });

    const res = await feedback(ctx);

    expect(res.status).toBe(200);
    expect(ctx.prisma.interviewPracticeAnswer.update).not.toHaveBeenCalled();
    expect(ctx.prisma.interviewPracticeRound.update).not.toHaveBeenCalled();
  });

  it('503 and nothing stored when the AI feedback has the wrong shape', async () => {
    const mock = new MockAiProvider({
      respond: () => ({ ...roundFeedback, answers: ['only one'] }),
    });
    ctx = makeApp('CANDIDATE', mock);
    ctx.prisma.interviewPracticeRound.findFirst.mockResolvedValue(feedbackRound());

    const res = await feedback(ctx);

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('AI_UNAVAILABLE');
    expect(ctx.prisma.$transaction).not.toHaveBeenCalled();
    expect(ctx.prisma.interviewPracticeRound.update).not.toHaveBeenCalled();
  });

  it('503 on a provider failure or timeout, nothing stored, retryable', async () => {
    setup(feedbackAi(undefined, { index: 0, error: new Error('vendor secret') }));
    const failed = await feedback(ctx);
    expect(failed.status).toBe(503);
    expect(JSON.stringify(failed.body)).not.toContain('vendor secret');
    expect(ctx.prisma.$transaction).not.toHaveBeenCalled();

    const slow = { generateJson: vi.fn(() => new Promise(() => {})) } as unknown as AiProvider;
    ctx = makeApp('CANDIDATE', slow, 20);
    ctx.prisma.interviewPracticeRound.findFirst.mockResolvedValue(feedbackRound());
    const timedOut = await feedback(ctx);
    expect(timedOut.status).toBe(503);
    expect(ctx.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('keeps the stored round feedback when the summary fails, and does not complete the session', async () => {
    setup(feedbackAi(undefined, { index: 1, error: new AppError('AI_UNAVAILABLE', 'down') }));
    ctx.prisma.interviewSession.findUnique.mockResolvedValue(
      sessionRow({ rounds: [completedRound(ROUND, 1)] }),
    );

    const res = await feedback(ctx);

    expect(res.status).toBe(503);
    expect(ctx.prisma.interviewPracticeRound.update).toHaveBeenCalledTimes(1);
    expect(ctx.prisma.interviewSession.updateMany).not.toHaveBeenCalled();
  });

  it.each([
    ['no interview consent', { session: sessionOf({ interviewConsentAt: null }) }, 403],
    ['an expired session', { session: sessionOf({ expiresAt: NOW }) }, 404],
  ])('%s: no AI call', async (_label, over, status) => {
    ctx.prisma.interviewPracticeRound.findFirst.mockResolvedValue(feedbackRound(5, over));

    const res = await feedback(ctx);

    expect(res.status).toBe(status);
    expect(ai.generateJson).not.toHaveBeenCalled();
  });

  it('only the owner can read it: other candidates 404, recruiters 403, anonymous 401', async () => {
    ctx.prisma.interviewPracticeRound.findFirst.mockResolvedValue(null);
    expect((await feedback(ctx)).status).toBe(404);
    expect(ctx.prisma.interviewPracticeRound.findFirst.mock.calls[0]![0].where).toEqual({
      id: ROUND,
      sessionId: SESSION,
      session: { candidateId: 'profile-1' },
    });
    expect((await feedback(makeApp('RECRUITER', ai.ai))).status).toBe(403);
    expect(
      (await request(ctx.app).post(`${BASE}/${SESSION}/rounds/${ROUND}/feedback`)).status,
    ).toBe(401);
    expect(ai.generateJson).not.toHaveBeenCalled();
  });

  it('never returns a score, rank, percentile or verdict', async () => {
    const res = await feedback(ctx);

    expect(JSON.stringify(res.body)).not.toMatch(/score|rank|percentile|verdict|recommend/i);
  });

  it('draws from the same 10-per-minute counter as question generation', async () => {
    ctx.prisma.interviewPracticeRound.findFirst.mockResolvedValue(
      roundRow({ _count: { questions: 5 }, status: 'COMPLETED', questions: [] }),
    );
    ctx.prisma.interviewSession.findUnique.mockResolvedValue(
      sessionRow({ status: 'COMPLETED', summary: JSON.stringify(summaryBody) }),
    );

    for (let i = 0; i < 5; i++) expect((await generate(ctx)).status).toBe(200);
    for (let i = 0; i < 5; i++) expect((await feedback(ctx)).status).toBe(200);
    const limited = await feedback(ctx);

    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe('RATE_LIMITED');
    expect((await generate(ctx)).status).toBe(429);
  });
});
