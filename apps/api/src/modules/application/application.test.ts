/* eslint-disable @typescript-eslint/no-explicit-any */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '@/middlewares/error-handler';
import { createApplicationRouter } from '@/modules/application/application.routes';
import { createApplicationService } from '@/modules/application/application.service';
import type { createAuthService } from '@/modules/auth/auth.service';
import type { PrismaClient } from '@/generated/prisma/client';

const JOB = '11111111-1111-4111-8111-111111111111';
const RESUME = '22222222-2222-4222-8222-222222222222';
const STAGE = '33333333-3333-4333-8333-333333333333';
const auth = { Authorization: 'Bearer token' };
const body = { jobId: JOB, resumeId: RESUME, coverLetter: 'I would love to join.' };

function makeApp(role: 'CANDIDATE' | 'RECRUITER' = 'CANDIDATE') {
  const prisma = {
    candidateProfile: { findUnique: vi.fn(async () => ({ id: 'profile-1' })) },
    job: {
      findFirst: vi.fn<(args: any) => Promise<any>>(async () => ({
        id: JOB,
        stages: [{ id: STAGE }],
      })),
    },
    resume: { findUnique: vi.fn(async () => ({ id: RESUME, candidateId: 'profile-1' })) },
    application: {
      findUnique: vi.fn(async () => null),
      create: vi.fn(async ({ data }: any) => ({
        id: '44444444-4444-4444-8444-444444444444',
        jobId: data.jobId,
        resumeId: data.resumeId,
        status: 'SUBMITTED',
        coverLetter: data.coverLetter ?? null,
        currentStageId: data.currentStageId ?? null,
        createdAt: new Date('2026-11-12T00:00:00Z'),
      })),
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

describe('POST /applications', () => {
  let ctx: ReturnType<typeof makeApp>;
  beforeEach(() => {
    ctx = makeApp();
  });

  it('201 with the application DTO', async () => {
    const res = await request(ctx.app).post('/applications').set(auth).send(body);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      jobId: JOB,
      resumeId: RESUME,
      status: 'SUBMITTED',
      coverLetter: 'I would love to join.',
      currentStageId: STAGE,
    });
  });

  it('404 when the job is not published', async () => {
    ctx.prisma.job.findFirst.mockResolvedValue(null as never);
    const res = await request(ctx.app).post('/applications').set(auth).send(body);

    expect(res.status).toBe(404);
    expect(ctx.prisma.application.create).not.toHaveBeenCalled();
    expect(ctx.prisma.job.findFirst.mock.calls[0]![0].where).toMatchObject({
      id: JOB,
      publicationStatus: 'PUBLISHED',
    });
  });

  it('403 when the resume belongs to another candidate', async () => {
    ctx.prisma.resume.findUnique.mockResolvedValue({ id: RESUME, candidateId: 'someone-else' });
    const res = await request(ctx.app).post('/applications').set(auth).send(body);

    expect(res.status).toBe(403);
    expect(ctx.prisma.application.create).not.toHaveBeenCalled();
  });

  it('409 on a duplicate application', async () => {
    ctx.prisma.application.findUnique.mockResolvedValue({ id: 'existing' } as never);
    const res = await request(ctx.app).post('/applications').set(auth).send(body);

    expect(res.status).toBe(409);
    expect(ctx.prisma.application.create).not.toHaveBeenCalled();
  });

  it('409 when a concurrent request wins the unique constraint', async () => {
    ctx.prisma.application.create.mockRejectedValue(
      Object.assign(new Error('dup'), { code: 'P2002' }),
    );
    const res = await request(ctx.app).post('/applications').set(auth).send(body);

    expect(res.status).toBe(409);
  });

  it('401 without a session and 403 for a recruiter', async () => {
    const anonymous = await request(ctx.app).post('/applications').send(body);
    expect(anonymous.status).toBe(401);

    const recruiter = makeApp('RECRUITER');
    const res = await request(recruiter.app).post('/applications').set(auth).send(body);
    expect(res.status).toBe(403);
    expect(recruiter.prisma.application.create).not.toHaveBeenCalled();
  });

  it('writes the SUBMITTED history in the same create and sets the first stage', async () => {
    await request(ctx.app).post('/applications').set(auth).send(body);

    const data = ctx.prisma.application.create.mock.calls[0]![0].data;
    expect(data.currentStageId).toBe(STAGE);
    expect(data.statusHistory).toEqual({ create: { fromStatus: null, toStatus: 'SUBMITTED' } });
    expect(ctx.prisma.job.findFirst.mock.calls[0]![0].select.stages).toMatchObject({
      orderBy: { position: 'asc' },
      take: 1,
    });
  });

  it('leaves currentStageId empty when the job has no stages', async () => {
    ctx.prisma.job.findFirst.mockResolvedValue({ id: JOB, stages: [] } as never);
    const res = await request(ctx.app).post('/applications').set(auth).send(body);

    expect(res.status).toBe(201);
    expect(res.body.currentStageId).toBeNull();
  });

  it('400 when the cover letter exceeds 2000 characters', async () => {
    const res = await request(ctx.app)
      .post('/applications')
      .set(auth)
      .send({ ...body, coverLetter: 'x'.repeat(2001) });

    expect(res.status).toBe(400);
  });
});
