import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '@/middlewares/error-handler';
import { createJobRoundsRouter } from '@/modules/job/job-rounds.routes';
import { createJobRoundsService } from '@/modules/job/job-rounds.service';
import type { createAuthService } from '@/modules/auth/auth.service';
import type { PrismaClient } from '@/generated/prisma/client';

const JOB = '11111111-1111-4111-8111-111111111111';
const S1 = '22222222-2222-4222-8222-222222222221';
const S2 = '22222222-2222-4222-8222-222222222222';
const auth = { Authorization: 'Bearer token' };
const round = { name: 'Screening', format: 'ONLINE', estimatedDurationMinutes: 30 };

function makeApp(role: 'RECRUITER' | 'CANDIDATE' = 'RECRUITER') {
  const tx = {
    $queryRaw: vi.fn(),
    jobStage: {
      findMany: vi.fn(async () => [{ id: S1 }, { id: S2 }]),
      update: vi.fn(async ({ where, data }) => ({ id: where.id, ...data })),
      create: vi.fn(async ({ data }) => ({ id: '33333333-3333-4333-8333-333333333333', ...data })),
      deleteMany: vi.fn(),
    },
    application: { count: vi.fn(async () => 0) },
  };
  const prisma = {
    job: {
      findUnique: vi.fn(async () => ({ createdById: 'user-1', company: { ownerId: 'user-1' } })),
    },
    jobStage: { findMany: vi.fn(async () => []) },
    $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const authService = {
    verifyAccessToken: vi.fn(() => ({ userId: 'user-1', sessionId: 's' })),
    getSessionUser: vi.fn(async () => ({ id: 'user-1', role })),
  } as unknown as ReturnType<typeof createAuthService>;
  const app = express();
  app.use(express.json());
  app.use(
    '/jobs',
    createJobRoundsRouter(authService, createJobRoundsService(prisma as unknown as PrismaClient)),
  );
  app.use(errorHandler);
  return { app, prisma, tx };
}

describe('PUT /jobs/:id/rounds', () => {
  let ctx: ReturnType<typeof makeApp>;
  beforeEach(() => {
    ctx = makeApp();
  });

  it('401 without token', async () => {
    const res = await request(ctx.app).put(`/jobs/${JOB}/rounds`).send({ rounds: [] });
    expect(res.status).toBe(401);
  });

  it('403 for candidate', async () => {
    const { app } = makeApp('CANDIDATE');
    const res = await request(app).put(`/jobs/${JOB}/rounds`).set(auth).send({ rounds: [] });
    expect(res.status).toBe(403);
  });

  it('403 when recruiter does not own job', async () => {
    ctx.prisma.job.findUnique.mockResolvedValue({ createdById: 'x', company: { ownerId: 'y' } });
    const res = await request(ctx.app).put(`/jobs/${JOB}/rounds`).set(auth).send({ rounds: [] });
    expect(res.status).toBe(403);
  });

  it('400 on missing name, bad format, bad duration', async () => {
    const res = await request(ctx.app)
      .put(`/jobs/${JOB}/rounds`)
      .set(auth)
      .send({ rounds: [{ name: ' ', format: 'TELEPATHY', estimatedDurationMinutes: 0 }] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('assigns positions from array order, reordering existing rounds', async () => {
    const res = await request(ctx.app)
      .put(`/jobs/${JOB}/rounds`)
      .set(auth)
      .send({ rounds: [{ ...round, id: S2 }, { ...round, name: 'Final', id: S1 }, round] });
    expect(res.status).toBe(200);
    expect(
      res.body.rounds.map((r: { id: string; position: number }) => [r.id, r.position]),
    ).toEqual([
      [S2, 1],
      [S1, 2],
      ['33333333-3333-4333-8333-333333333333', 3],
    ]);
    expect(ctx.tx.jobStage.deleteMany).not.toHaveBeenCalled();
  });

  it('deletes omitted rounds', async () => {
    const res = await request(ctx.app)
      .put(`/jobs/${JOB}/rounds`)
      .set(auth)
      .send({ rounds: [{ ...round, id: S1 }] });
    expect(res.status).toBe(200);
    expect(ctx.tx.jobStage.deleteMany).toHaveBeenCalledWith({ where: { id: { in: [S2] } } });
  });

  it('409 when deleting a round with applications', async () => {
    ctx.tx.application.count.mockResolvedValue(2);
    const res = await request(ctx.app).put(`/jobs/${JOB}/rounds`).set(auth).send({ rounds: [] });
    expect(res.status).toBe(409);
  });

  it('400 on foreign round id', async () => {
    const res = await request(ctx.app)
      .put(`/jobs/${JOB}/rounds`)
      .set(auth)
      .send({ rounds: [{ ...round, id: '44444444-4444-4444-8444-444444444444' }] });
    expect(res.status).toBe(400);
  });
});

describe('GET /jobs/:id/rounds', () => {
  it('returns ordered rounds', async () => {
    const { app, prisma } = makeApp();
    prisma.jobStage.findMany.mockResolvedValue([
      { id: S1, name: 'A', format: 'PHONE', estimatedDurationMinutes: 15, position: 1 },
    ] as never);
    const res = await request(app).get(`/jobs/${JOB}/rounds`).set(auth);
    expect(res.status).toBe(200);
    expect(res.body.rounds[0]).toMatchObject({ format: 'PHONE', position: 1 });
  });
});
