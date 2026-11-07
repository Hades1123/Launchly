/* eslint-disable @typescript-eslint/no-explicit-any */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://launchly:launchly@localhost:5433/launchly';
process.env.JWT_SECRET = 'change-me-at-least-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'change-me-too-at-least-32-characters';

import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { apiErrorSchema, publicJobDetailSchema, publicJobListResponseSchema } from '@launchly/shared';
import { createApp } from '@/app';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: { job: { findMany: vi.fn(), count: vi.fn(), findFirst: vi.fn() } },
}));

const ID = '00000000-0000-4000-8000-000000000401';
const row = (salaryHidden: boolean) => ({
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
  salaryHidden,
  createdAt: new Date('2026-11-01T00:00:00Z'),
  company: { id: 'c1', name: 'Acme', website: null },
});
const FORBIDDEN = ['salaryMin', 'salaryMax', 'salaryHidden', 'publicationStatus', 'moderationReason', 'createdById'];

describe('salary visibility', () => {
  const app = createApp();
  beforeEach(() => vi.clearAllMocks());

  describe.each([
    ['search', '/jobs', () => (prisma.job.findMany as any).mockResolvedValue([row(true)]), (b: any) => b.data[0]],
    ['detail', `/jobs/${ID}`, () => (prisma.job.findFirst as any).mockResolvedValue(row(true)), (b: any) => b],
  ])('%s', (_n, url, arm, pick) => {
    it('hides stored figures when salaryHidden', async () => {
      arm();
      (prisma.job.count as any).mockResolvedValue(1);
      const res = await request(app).get(url);
      expect(res.status).toBe(200);
      expect(pick(res.body).salary).toEqual({ negotiable: true, min: null, max: null });
      expect(JSON.stringify(res.body)).not.toMatch(/:(2000|4000)\b/);
      for (const k of FORBIDDEN) expect(JSON.stringify(res.body)).not.toContain(`"${k}"`);
    });
  });

  it('search shows range when visible and matches schema', async () => {
    (prisma.job.findMany as any).mockResolvedValue([row(false)]);
    (prisma.job.count as any).mockResolvedValue(1);
    const res = await request(app).get('/jobs');
    expect(publicJobListResponseSchema.parse(res.body).data[0]!.salary).toEqual({
      negotiable: false,
      min: 2000,
      max: 4000,
    });
  });

  it('detail shows range when visible, uses the public where, matches schema', async () => {
    (prisma.job.findFirst as any).mockResolvedValue(row(false));
    const res = await request(app).get(`/jobs/${ID}`);
    expect(res.status).toBe(200);
    expect(publicJobDetailSchema.parse(res.body).salary).toEqual({ negotiable: false, min: 2000, max: 4000 });
    expect(prisma.job.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ID, publicationStatus: 'PUBLISHED', company: { moderationStatus: 'APPROVED' } },
      }),
    );
  });

  it('detail returns 404 for non-public or unknown job', async () => {
    (prisma.job.findFirst as any).mockResolvedValue(null);
    const res = await request(app).get(`/jobs/${ID}`);
    expect(res.status).toBe(404);
    expect(apiErrorSchema.parse(res.body).error).toMatchObject({ code: 'NOT_FOUND', message: 'Job not found' });
  });

  it('detail returns 400 for invalid id without querying', async () => {
    const res = await request(app).get('/jobs/not-a-uuid');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(prisma.job.findFirst).not.toHaveBeenCalled();
  });
});
