/* eslint-disable @typescript-eslint/no-explicit-any */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Readable } from 'node:stream';
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recruiterApplicationListSchema, recruiterApplicationSchema } from '@launchly/shared';
import { errorHandler } from '@/middlewares/error-handler';
import { createApplicationRouter } from '@/modules/application/application.routes';
import { createApplicationService } from '@/modules/application/application.service';
import { createJobApplicationsRouter } from '@/modules/application/job-applications.routes';
import type { createAuthService } from '@/modules/auth/auth.service';
import type { PrismaClient } from '@/generated/prisma/client';
import type { StorageProvider } from '@/providers/storage/storage.interface';

const JOB = '11111111-1111-4111-8111-111111111111';
const APP_ID = '44444444-4444-4444-8444-444444444444';
const STAGE = '33333333-3333-4333-8333-333333333333';
const auth = { Authorization: 'Bearer token' };

type Role = 'CANDIDATE' | 'RECRUITER';

const applicantRow = (overrides: Record<string, unknown> = {}) => ({
  id: APP_ID,
  status: 'SUBMITTED',
  createdAt: new Date('2026-11-10T00:00:00Z'),
  candidate: {
    headline: 'Junior dev',
    skills: ['React', 'Node.js'],
    user: { fullName: 'An Nguyen' },
  },
  resume: { id: 'resume-1', fileName: 'cv.pdf' },
  currentStage: { id: STAGE, name: 'Screening' },
  ...overrides,
});

const accessRow = (overrides: Record<string, unknown> = {}) => ({
  id: APP_ID,
  jobId: JOB,
  status: 'SUBMITTED',
  currentStageId: STAGE,
  candidate: { userId: 'candidate-user' },
  resume: { storageKey: 'key-1', fileName: 'cv.pdf', contentType: 'application/pdf' },
  job: { createdById: 'user-1', company: { ownerId: 'user-1' } },
  ...overrides,
});

function makeApp(role: Role = 'RECRUITER', userId = 'user-1') {
  const prisma = {
    job: {
      findUnique: vi.fn<(args: any) => Promise<any>>(async () => ({
        createdById: 'user-1',
        company: { ownerId: 'user-1' },
      })),
    },
    jobStage: { findFirst: vi.fn<(args: any) => Promise<any>>(async () => ({ id: STAGE })) },
    application: {
      findMany: vi.fn<(args: any) => Promise<any>>(async () => [applicantRow()]),
      findUnique: vi.fn<(args: any) => Promise<any>>(async () => accessRow()),
      update: vi.fn<(args: any) => Promise<any>>(async ({ data }: any) =>
        applicantRow({ status: data.status }),
      ),
    },
  };
  const storage = {
    getStream: vi.fn(async () => Readable.from([Buffer.from('%PDF-fake')])),
  } as unknown as StorageProvider;
  const authService = {
    verifyAccessToken: vi.fn(() => ({ userId, sessionId: 's' })),
    getSessionUser: vi.fn(async () => ({ id: userId, role })),
  } as unknown as ReturnType<typeof createAuthService>;
  const service = createApplicationService(prisma as unknown as PrismaClient, storage);
  const app = express();
  app.use(express.json());
  app.use('/applications', createApplicationRouter(authService, service));
  app.use('/jobs', createJobApplicationsRouter(authService, service));
  app.use(errorHandler);
  return { app, prisma, storage };
}

describe('GET /jobs/:id/applications', () => {
  let ctx: ReturnType<typeof makeApp>;
  beforeEach(() => {
    ctx = makeApp();
  });

  it('lists the applicants of an owned job with candidate, resume, status and stage', async () => {
    const res = await request(ctx.app).get(`/jobs/${JOB}/applications`).set(auth);

    expect(res.status).toBe(200);
    expect(recruiterApplicationListSchema.safeParse(res.body).success).toBe(true);
    expect(res.body.data[0]).toEqual({
      id: APP_ID,
      status: 'SUBMITTED',
      submittedAt: '2026-11-10T00:00:00.000Z',
      candidate: { name: 'An Nguyen', headline: 'Junior dev', skills: ['React', 'Node.js'] },
      resume: { id: 'resume-1', fileName: 'cv.pdf' },
      currentStage: { id: STAGE, name: 'Screening' },
    });
    const args = ctx.prisma.application.findMany.mock.calls[0]![0];
    expect(args.where).toEqual({ jobId: JOB });
    expect(args.orderBy).toEqual({ createdAt: 'desc' });
  });

  it('404 for an unknown job', async () => {
    ctx.prisma.job.findUnique.mockResolvedValue(null);
    const res = await request(ctx.app).get(`/jobs/${JOB}/applications`).set(auth);

    expect(res.status).toBe(404);
  });

  it('403 for a non-owner recruiter and for a candidate; 401 without a session', async () => {
    ctx.prisma.job.findUnique.mockResolvedValue({
      createdById: 'other',
      company: { ownerId: 'other' },
    });
    const nonOwner = await request(ctx.app).get(`/jobs/${JOB}/applications`).set(auth);
    expect(nonOwner.status).toBe(403);
    expect(ctx.prisma.application.findMany).not.toHaveBeenCalled();

    const candidate = makeApp('CANDIDATE');
    expect((await request(candidate.app).get(`/jobs/${JOB}/applications`).set(auth)).status).toBe(
      403,
    );
    expect((await request(ctx.app).get(`/jobs/${JOB}/applications`)).status).toBe(401);
  });
});

describe('PATCH /applications/:id/status', () => {
  let ctx: ReturnType<typeof makeApp>;
  beforeEach(() => {
    ctx = makeApp();
  });
  const patch = (c: ReturnType<typeof makeApp>, body: unknown) =>
    request(c.app)
      .patch(`/applications/${APP_ID}/status`)
      .set(auth)
      .send(body as object);

  it('a status change writes exactly one history row in the same update', async () => {
    const res = await patch(ctx, { status: 'INTERVIEW', note: 'Strong CV' });

    expect(res.status).toBe(200);
    expect(recruiterApplicationSchema.safeParse(res.body).success).toBe(true);
    expect(res.body.status).toBe('INTERVIEW');
    expect(ctx.prisma.application.update).toHaveBeenCalledTimes(1);
    const data = ctx.prisma.application.update.mock.calls[0]![0].data;
    expect(data.status).toBe('INTERVIEW');
    expect(data.statusHistory).toEqual({
      create: { fromStatus: 'SUBMITTED', toStatus: 'INTERVIEW', note: 'Strong CV' },
    });
  });

  it('moves the application to a stage of the same job', async () => {
    await patch(ctx, { status: 'SCREENING', stageId: STAGE });

    expect(ctx.prisma.jobStage.findFirst.mock.calls[0]![0].where).toEqual({
      id: STAGE,
      jobId: JOB,
    });
    expect(ctx.prisma.application.update.mock.calls[0]![0].data.currentStageId).toBe(STAGE);
  });

  it('rejects an invalid status, a repeated status and a stage of another job with 400', async () => {
    expect((await patch(ctx, { status: 'SUBMITTED' })).status).toBe(400);
    expect((await patch(ctx, { status: 'NOPE' })).status).toBe(400);

    ctx.prisma.application.findUnique.mockResolvedValue(accessRow({ status: 'OFFER' }));
    expect((await patch(ctx, { status: 'OFFER' })).status).toBe(400);

    ctx.prisma.application.findUnique.mockResolvedValue(accessRow());
    ctx.prisma.jobStage.findFirst.mockResolvedValue(null);
    expect((await patch(ctx, { status: 'INTERVIEW', stageId: STAGE })).status).toBe(400);
    expect(ctx.prisma.application.update).not.toHaveBeenCalled();
  });

  it('403 for a non-owner recruiter and for a candidate; 404 for an unknown application', async () => {
    ctx.prisma.application.findUnique.mockResolvedValue(
      accessRow({ job: { createdById: 'other', company: { ownerId: 'other' } } }),
    );
    expect((await patch(ctx, { status: 'INTERVIEW' })).status).toBe(403);
    expect(ctx.prisma.application.update).not.toHaveBeenCalled();

    const candidate = makeApp('CANDIDATE');
    expect((await patch(candidate, { status: 'INTERVIEW' })).status).toBe(403);

    ctx.prisma.application.findUnique.mockResolvedValue(null);
    expect((await patch(ctx, { status: 'INTERVIEW' })).status).toBe(404);
  });
});

describe('GET /applications/:id/resume', () => {
  const get = (c: ReturnType<typeof makeApp>) =>
    request(c.app).get(`/applications/${APP_ID}/resume`).set(auth);

  it('serves the CV file to the owner recruiter', async () => {
    const ctx = makeApp('RECRUITER');
    const res = await get(ctx);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.headers['content-disposition']).toContain('cv.pdf');
    expect(ctx.storage.getStream).toHaveBeenCalledWith('key-1');
  });

  it('serves the CV file to the candidate who applied', async () => {
    const ctx = makeApp('CANDIDATE', 'candidate-user');
    expect((await get(ctx)).status).toBe(200);
  });

  it('403 for a non-owner recruiter and for another candidate; 404 for an unknown application', async () => {
    const recruiter = makeApp('RECRUITER', 'someone-else');
    expect((await get(recruiter)).status).toBe(403);
    const candidate = makeApp('CANDIDATE', 'another-candidate');
    expect((await get(candidate)).status).toBe(403);
    expect(candidate.storage.getStream).not.toHaveBeenCalled();

    const missing = makeApp('RECRUITER');
    missing.prisma.application.findUnique.mockResolvedValue(null);
    expect((await get(missing)).status).toBe(404);
  });
});

describe('contract documentation', () => {
  it('lists every endpoint, status value and error code in docs/api/recruiter-applications.md', () => {
    const file = resolve(__dirname, '../../../../../docs/api/recruiter-applications.md');
    expect(existsSync(file)).toBe(true);
    const doc = readFileSync(file, 'utf8');
    for (const needle of [
      'GET /jobs/:jobId/applications',
      'PATCH /applications/:id/status',
      'GET /applications/:id/resume',
      'SCREENING',
      'INTERVIEW',
      'OFFER',
      'ACCEPTED',
      'REJECTED',
      '400',
      '403',
      '404',
    ]) {
      expect(doc).toContain(needle);
    }
  });
});
