/* eslint-disable @typescript-eslint/no-explicit-any */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://launchly:launchly@localhost:5433/launchly';
process.env.JWT_SECRET = 'change-me-at-least-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'change-me-too-at-least-32-characters';

import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { apiErrorSchema, publicJobDetailSchema } from '@launchly/shared';
import { createApp } from '@/app';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({ prisma: { job: { findFirst: vi.fn() } } }));

const ID = '00000000-0000-4000-8000-000000000401';
const STAGES = [
  {
    id: 's1',
    name: 'Screening',
    description: null,
    position: 1,
    format: 'PHONE',
    estimatedDurationMinutes: 20,
  },
  {
    id: 's2',
    name: 'Interview',
    description: 'With the team',
    position: 2,
    format: null,
    estimatedDurationMinutes: null,
  },
];
const NOTES = [
  { id: 'n1', content: 'Bring a laptop', position: 1 },
  { id: 'n2', content: 'Dress casually', position: 2 },
];
const row = () => ({
  id: ID,
  title: 'Dev',
  description: 'Build',
  level: 'FRESHER',
  location: 'Hanoi',
  industry: 'Technology',
  requirements: [],
  benefits: [],
  salaryMin: 2000,
  salaryMax: 4000,
  salaryHidden: false,
  createdAt: new Date('2026-11-01T00:00:00Z'),
  company: { id: 'c1', name: 'Acme', website: null, logoUrl: null },
  stages: STAGES,
  notes: NOTES,
});
const FORBIDDEN = ['publicationStatus', 'moderationReason', 'createdById', 'salaryHidden'];
const findFirst = prisma.job.findFirst as any;

describe('GET /jobs/:id process and notes', () => {
  const app = createApp();
  beforeEach(() => vi.clearAllMocks());

  it('returns stages ordered by position with format and duration', async () => {
    findFirst.mockResolvedValue(row());
    const res = await request(app).get(`/jobs/${ID}`);

    expect(res.status).toBe(200);
    expect(publicJobDetailSchema.safeParse(res.body).success).toBe(true);
    expect(res.body.stages).toEqual(STAGES);
    const args = findFirst.mock.calls[0][0];
    expect(args.select.stages.orderBy).toEqual({ position: 'asc' });
    expect(args.where).toMatchObject({
      publicationStatus: 'PUBLISHED',
      company: { moderationStatus: 'APPROVED' },
    });
  });

  it('returns notes ordered by position', async () => {
    findFirst.mockResolvedValue(row());
    const res = await request(app).get(`/jobs/${ID}`);

    expect(res.body.notes).toEqual(NOTES);
    expect(findFirst.mock.calls[0][0].select.notes.orderBy).toEqual({ position: 'asc' });
  });

  it('shows an unknown stored format as no format instead of leaking free text', async () => {
    findFirst.mockResolvedValue({ ...row(), stages: [{ ...STAGES[0], format: 'WHATEVER' }] });
    const res = await request(app).get(`/jobs/${ID}`);

    expect(res.status).toBe(200);
    expect(res.body.stages[0].format).toBeNull();
  });

  it('404 body is identical for an unknown and a pending job, and no internal fields leak', async () => {
    findFirst.mockResolvedValue(null);
    const unknown = await request(app).get(`/jobs/${ID}`);
    const pending = await request(app).get('/jobs/00000000-0000-4000-8000-000000000403');

    expect(unknown.status).toBe(404);
    expect(apiErrorSchema.safeParse(unknown.body).success).toBe(true);
    expect(pending.body).toEqual(unknown.body);

    findFirst.mockResolvedValue(row());
    const ok = await request(app).get(`/jobs/${ID}`);
    for (const key of FORBIDDEN) expect(JSON.stringify(ok.body)).not.toContain(`"${key}"`);
  });
});
