import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { apiErrorSchema, recruiterJobSchema } from '@launchly/shared';
import { errorHandler } from '@/middlewares/error-handler';
import { createRecruiterJobRouter } from '@/modules/job/recruiter-job.routes';
import { createRecruiterJobService } from '@/modules/job/recruiter-job.service';
import type { createAuthService } from '@/modules/auth/auth.service';
import type { PrismaClient } from '@/generated/prisma/client';

const JOB = '11111111-1111-4111-8111-111111111111';
const COMPANY = '44444444-4444-4444-8444-444444444444';
const auth = { Authorization: 'Bearer token' };
const NOW = new Date('2026-11-13T00:00:00.000Z');

const submitBody = {
  action: 'SUBMIT',
  title: 'Thực tập sinh Backend',
  description: 'Xây dựng API.',
  level: 'INTERN',
  location: 'Ho Chi Minh City',
  industry: 'Technology',
  requirements: ['Node.js'],
  benefits: [],
  salary: { hidden: false, min: 300, max: 500 },
  rounds: [
    { name: 'Sàng lọc CV', format: 'ONLINE', estimatedDurationMinutes: 15 },
    { name: 'Phỏng vấn', format: 'ONSITE', estimatedDurationMinutes: 60 },
  ],
  notes: ['Mang laptop.'],
};

const draftBody = {
  ...submitBody,
  action: 'DRAFT',
  industry: null,
  salary: { hidden: false, min: null, max: null },
  rounds: [{ name: '', format: null, estimatedDurationMinutes: null }],
  notes: [],
};

/** Echoes what the service writes back as a stored row, so assertions see the saved data. */
function rowFrom(data: Record<string, unknown>) {
  const stages = (data.stages as { create: Record<string, unknown>[] }).create;
  const notes = (data.notes as { create: Record<string, unknown>[] }).create;
  return {
    id: JOB,
    ...data,
    moderationReason: null,
    createdAt: NOW,
    updatedAt: NOW,
    stages: stages.map((s, i) => ({ id: `00000000-0000-4000-8000-00000000000${i}`, ...s })),
    notes: notes.map((n, i) => ({ id: `n${i}`, ...n })),
  };
}

type Access = {
  createdById: string;
  publicationStatus: string;
  company: { ownerId: string; moderationStatus: string };
};

function makeApp({
  role = 'RECRUITER',
  companies = [{ id: COMPANY, moderationStatus: 'APPROVED' }],
  access = {
    createdById: 'user-1',
    publicationStatus: 'DRAFT',
    company: { ownerId: 'user-1', moderationStatus: 'APPROVED' },
  } as Access | null,
}: {
  role?: 'RECRUITER' | 'CANDIDATE';
  companies?: { id: string; moderationStatus: string }[];
  access?: Access | null;
} = {}) {
  const tx = {
    $queryRaw: vi.fn(),
    job: {
      findUnique: vi.fn(async () => access),
      findMany: vi.fn(async () => (access ? [access] : [])),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => rowFrom(data)),
      deleteMany: vi.fn(),
    },
    application: { count: vi.fn(async () => 0) },
    jobStage: { deleteMany: vi.fn() },
    jobNote: { deleteMany: vi.fn() },
  };
  const prisma = {
    company: { findMany: vi.fn(async () => companies) },
    job: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => rowFrom(data)),
      findMany: vi.fn(async () => [
        {
          id: JOB,
          title: 'Draft',
          level: 'FRESHER',
          location: 'Remote',
          publicationStatus: 'DRAFT',
          moderationReason: null,
          updatedAt: NOW,
        },
      ]),
      count: vi.fn(async () => 11),
      groupBy: vi.fn(async () => [
        { publicationStatus: 'DRAFT', _count: { _all: 7 } },
        { publicationStatus: 'PUBLISHED', _count: { _all: 4 } },
      ]),
      findUnique: vi.fn(async () =>
        access
          ? {
              ...access,
              ...rowFrom({ ...submitBody, stages: { create: [] }, notes: { create: [] } }),
              publicationStatus: access.publicationStatus,
              salaryMin: 300,
              salaryMax: 500,
              salaryHidden: false,
            }
          : null,
      ),
    },
    $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const authService = {
    verifyAccessToken: vi.fn(() => ({ userId: 'user-1', sessionId: 's' })),
    getSessionUser: vi.fn(async () => ({ id: 'user-1', role })),
  } as unknown as ReturnType<typeof createAuthService>;
  const app = express();
  app.use(express.json());
  app.use(
    '/recruiter/jobs',
    createRecruiterJobRouter(
      authService,
      createRecruiterJobService(prisma as unknown as PrismaClient),
    ),
  );
  app.use(errorHandler);
  return { app, prisma, tx };
}

function errorCode(res: request.Response) {
  return apiErrorSchema.parse(res.body).error.code;
}

describe('access to /recruiter/jobs', () => {
  it('401 without a token', async () => {
    const res = await request(makeApp().app).post('/recruiter/jobs').send(submitBody);
    expect(res.status).toBe(401);
  });

  it('403 for a candidate', async () => {
    const res = await request(makeApp({ role: 'CANDIDATE' }).app)
      .post('/recruiter/jobs')
      .set(auth)
      .send(submitBody);
    expect(res.status).toBe(403);
  });
});

describe('POST /recruiter/jobs', () => {
  it('submits a job as PENDING under the approved company, rounds and notes in order', async () => {
    const { app, prisma } = makeApp();
    const res = await request(app).post('/recruiter/jobs').set(auth).send(submitBody);

    expect(res.status).toBe(201);
    const job = recruiterJobSchema.parse(res.body);
    expect(job.status).toBe('PENDING');
    expect(job.rounds.map((r) => [r.name, r.position])).toEqual([
      ['Sàng lọc CV', 1],
      ['Phỏng vấn', 2],
    ]);
    expect(job.notes).toEqual([{ id: 'n0', content: 'Mang laptop.', position: 1 }]);
    const data = prisma.job.create.mock.calls[0]![0].data;
    expect(data).toMatchObject({
      companyId: COMPANY,
      createdById: 'user-1',
      titleNormalized: 'thuc tap sinh backend',
    });
  });

  it('saves a partial form as DRAFT without the submit rules', async () => {
    const { app } = makeApp();
    const res = await request(app).post('/recruiter/jobs').set(auth).send(draftBody);

    expect(res.status).toBe(201);
    const job = recruiterJobSchema.parse(res.body);
    expect(job.status).toBe('DRAFT');
    expect(job.rounds[0]).toMatchObject({ name: '', format: null, estimatedDurationMinutes: null });
  });

  it('never stores a negotiable salary', async () => {
    const { app, prisma } = makeApp();
    await request(app)
      .post('/recruiter/jobs')
      .set(auth)
      .send({ ...submitBody, salary: { hidden: true, min: 300, max: 500 } });

    expect(prisma.job.create.mock.calls[0]![0].data).toMatchObject({
      salaryHidden: true,
      salaryMin: null,
      salaryMax: null,
    });
  });

  it('400 with field paths when position and level are missing', async () => {
    const { app, prisma } = makeApp();
    const res = await request(app)
      .post('/recruiter/jobs')
      .set(auth)
      .send({ ...submitBody, title: '', level: '' });

    expect(res.status).toBe(400);
    const paths = apiErrorSchema.parse(res.body).error.details?.map((d) => d.path.join('.'));
    expect(paths).toEqual(expect.arrayContaining(['body.title', 'body.level']));
    expect(prisma.job.create).not.toHaveBeenCalled();
  });

  it('400 on a sixth note', async () => {
    const res = await request(makeApp().app)
      .post('/recruiter/jobs')
      .set(auth)
      .send({ ...submitBody, notes: Array(6).fill('x') });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0]).toMatchObject({
      path: ['body', 'notes'],
      message: 'Maximum 5 notes',
    });
  });

  it.each([
    [[], 'Register your company before posting a job'],
    [
      [{ id: COMPANY, moderationStatus: 'PENDING' }],
      'Your company must be approved before you can post a job',
    ],
  ])('403 with an explanation when the company is not approved (%j)', async (companies, msg) => {
    const { app, prisma } = makeApp({ companies });
    const res = await request(app).post('/recruiter/jobs').set(auth).send(draftBody);

    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe(msg);
    expect(prisma.job.create).not.toHaveBeenCalled();
  });

  it('409 when more than one approved company is linked', async () => {
    const companies = [
      { id: COMPANY, moderationStatus: 'APPROVED' },
      { id: 'other', moderationStatus: 'APPROVED' },
    ];
    const res = await request(makeApp({ companies }).app)
      .post('/recruiter/jobs')
      .set(auth)
      .send(submitBody);
    expect(errorCode(res)).toBe('CONFLICT');
  });
});

describe('PUT /recruiter/jobs/:id', () => {
  it('submits a draft and replaces its rounds and notes in one transaction', async () => {
    const { app, prisma, tx } = makeApp();
    const res = await request(app).put(`/recruiter/jobs/${JOB}`).set(auth).send(submitBody);

    expect(res.status).toBe(200);
    expect(recruiterJobSchema.parse(res.body).status).toBe('PENDING');
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(tx.jobStage.deleteMany).toHaveBeenCalledWith({ where: { jobId: JOB } });
    expect(tx.jobNote.deleteMany).toHaveBeenCalledWith({ where: { jobId: JOB } });
  });

  it('404 for an unknown job', async () => {
    const res = await request(makeApp({ access: null }).app)
      .put(`/recruiter/jobs/${JOB}`)
      .set(auth)
      .send(submitBody);
    expect(res.status).toBe(404);
  });

  it("403 for another recruiter's job", async () => {
    const access = {
      createdById: 'someone-else',
      publicationStatus: 'DRAFT',
      company: { ownerId: 'someone-else', moderationStatus: 'APPROVED' },
    };
    const { app, tx } = makeApp({ access });
    const res = await request(app).put(`/recruiter/jobs/${JOB}`).set(auth).send(submitBody);

    expect(res.status).toBe(403);
    expect(tx.job.update).not.toHaveBeenCalled();
  });

  it.each(['PENDING', 'PUBLISHED', 'CLOSED'])('409 for a %s job', async (status) => {
    const access = {
      createdById: 'user-1',
      publicationStatus: status,
      company: { ownerId: 'user-1', moderationStatus: 'APPROVED' },
    };
    const { app, tx } = makeApp({ access });
    const res = await request(app).put(`/recruiter/jobs/${JOB}`).set(auth).send(submitBody);

    expect(res.status).toBe(409);
    expect(tx.job.update).not.toHaveBeenCalled();
  });

  it('403 when the company is no longer approved', async () => {
    const access = {
      createdById: 'user-1',
      publicationStatus: 'DRAFT',
      company: { ownerId: 'user-1', moderationStatus: 'REJECTED' },
    };
    const res = await request(makeApp({ access }).app)
      .put(`/recruiter/jobs/${JOB}`)
      .set(auth)
      .send(submitBody);
    expect(res.status).toBe(403);
  });
});

describe('PUT /recruiter/jobs/:id on a rejected job', () => {
  const rejected = {
    createdById: 'user-1',
    publicationStatus: 'REJECTED',
    company: { ownerId: 'user-1', moderationStatus: 'APPROVED' },
  };

  it('resubmits it for review and keeps the old reason until an admin approves (E4)', async () => {
    const { app, tx } = makeApp({ access: rejected });
    const res = await request(app).put(`/recruiter/jobs/${JOB}`).set(auth).send(submitBody);
    expect(res.status).toBe(200);
    const data = tx.job.update.mock.calls[0]![0].data;
    expect(data.publicationStatus).toBe('PENDING');
    expect(data).not.toHaveProperty('moderationReason');
    // The new submission has not been reviewed yet.
    expect(data).toMatchObject({ reviewedById: null, reviewedAt: null });
  });

  it('keeps it rejected when only saved', async () => {
    const { app, tx } = makeApp({ access: rejected });
    const res = await request(app).put(`/recruiter/jobs/${JOB}`).set(auth).send(draftBody);
    expect(res.status).toBe(200);
    const data = tx.job.update.mock.calls[0]![0].data;
    expect(data.publicationStatus).toBe('REJECTED');
    expect(data).not.toHaveProperty('moderationReason');
  });

  it('409 when it already has applications', async () => {
    const { app, tx } = makeApp({ access: rejected });
    tx.application.count.mockResolvedValueOnce(2);
    const res = await request(app).put(`/recruiter/jobs/${JOB}`).set(auth).send(submitBody);
    expect(res.status).toBe(409);
    expect(tx.job.update).not.toHaveBeenCalled();
  });
});

describe('GET /recruiter/jobs', () => {
  it('lists one page of own jobs with counts per status', async () => {
    const { app, prisma } = makeApp();
    const res = await request(app).get('/recruiter/jobs?status=DRAFT&page=2').set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      jobs: [
        {
          id: JOB,
          title: 'Draft',
          level: 'FRESHER',
          location: 'Remote',
          status: 'DRAFT',
          moderationReason: null,
          updatedAt: NOW.toISOString(),
        },
      ],
      pagination: { page: 2, limit: 10, total: 11, totalPages: 2 },
      counts: { ALL: 11, DRAFT: 7, PENDING: 0, PUBLISHED: 4, REJECTED: 0, CLOSED: 0 },
    });
    expect(prisma.job.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 }),
    );
  });

  it('searches the title with and without accents', async () => {
    const { app, prisma } = makeApp();
    await request(app).get('/recruiter/jobs?q=Kỹ%20sư').set(auth);
    const [{ where }] = prisma.job.findMany.mock.calls[0] as unknown as [
      { where: { AND: unknown[] } },
    ];
    expect(where.AND).toContainEqual({
      OR: [
        { title: { contains: 'Kỹ sư', mode: 'insensitive' } },
        { titleNormalized: { contains: 'ky su' } },
      ],
    });
  });

  it('400 for an unknown status filter', async () => {
    const res = await request(makeApp().app).get('/recruiter/jobs?status=ARCHIVED').set(auth);
    expect(res.status).toBe(400);
    expect(errorCode(res)).toBe('VALIDATION_ERROR');
  });

  it('returns one job with its real salary to its owner', async () => {
    const res = await request(makeApp().app).get(`/recruiter/jobs/${JOB}`).set(auth);
    expect(res.status).toBe(200);
    expect(recruiterJobSchema.parse(res.body).salary).toEqual({
      hidden: false,
      min: 300,
      max: 500,
    });
  });

  it("403 for another recruiter's job", async () => {
    const access = {
      createdById: 'x',
      publicationStatus: 'DRAFT',
      company: { ownerId: 'x', moderationStatus: 'APPROVED' },
    };
    const res = await request(makeApp({ access }).app).get(`/recruiter/jobs/${JOB}`).set(auth);
    expect(res.status).toBe(403);
  });
});

describe('DELETE /recruiter/jobs/:id', () => {
  it('deletes an own draft', async () => {
    const { app, tx } = makeApp();
    const res = await request(app).delete(`/recruiter/jobs/${JOB}`).set(auth);
    expect(res.status).toBe(204);
    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(tx.job.deleteMany).toHaveBeenCalledWith({ where: { id: { in: [JOB] } } });
  });

  it('409 for a job that was already submitted', async () => {
    const access = {
      createdById: 'user-1',
      publicationStatus: 'PENDING',
      company: { ownerId: 'user-1', moderationStatus: 'APPROVED' },
    };
    const { app, tx } = makeApp({ access });
    const res = await request(app).delete(`/recruiter/jobs/${JOB}`).set(auth);
    expect(res.status).toBe(409);
    expect(tx.job.deleteMany).not.toHaveBeenCalled();
  });

  it("403 for another recruiter's draft and 404 for a missing one", async () => {
    const stranger = {
      createdById: 'x',
      publicationStatus: 'DRAFT',
      company: { ownerId: 'x', moderationStatus: 'APPROVED' },
    };
    const forbidden = await request(makeApp({ access: stranger }).app)
      .delete(`/recruiter/jobs/${JOB}`)
      .set(auth);
    expect(forbidden.status).toBe(403);
    const missing = await request(makeApp({ access: null }).app)
      .delete(`/recruiter/jobs/${JOB}`)
      .set(auth);
    expect(missing.status).toBe(404);
  });

  it('403 for a candidate', async () => {
    const res = await request(makeApp({ role: 'CANDIDATE' }).app)
      .delete(`/recruiter/jobs/${JOB}`)
      .set(auth);
    expect(res.status).toBe(403);
  });
});

describe('POST /recruiter/jobs/bulk-delete', () => {
  it('deletes the listed drafts in one go', async () => {
    const { app, tx } = makeApp();
    const res = await request(app)
      .post('/recruiter/jobs/bulk-delete')
      .set(auth)
      .send({ ids: [JOB, JOB] });
    expect(res.status).toBe(204);
    expect(tx.job.deleteMany).toHaveBeenCalledWith({ where: { id: { in: [JOB] } } });
  });

  it('404 and nothing deleted when one id is unknown', async () => {
    const { app, tx } = makeApp();
    const res = await request(app)
      .post('/recruiter/jobs/bulk-delete')
      .set(auth)
      .send({ ids: [JOB, COMPANY] });
    expect(res.status).toBe(404);
    expect(tx.job.deleteMany).not.toHaveBeenCalled();
  });

  it('400 for an empty list', async () => {
    const res = await request(makeApp().app)
      .post('/recruiter/jobs/bulk-delete')
      .set(auth)
      .send({ ids: [] });
    expect(res.status).toBe(400);
  });
});
