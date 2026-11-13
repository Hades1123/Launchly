/* eslint-disable @typescript-eslint/no-explicit-any */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://launchly:launchly@localhost:5433/launchly';
process.env.JWT_SECRET = 'change-me-at-least-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'change-me-too-at-least-32-characters';

import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { publicJobDetailSchema } from '@launchly/shared';
import { createApp } from '@/app';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({ prisma: { job: { findFirst: vi.fn() } } }));

const ID = '00000000-0000-4000-8000-000000000501';
const row = (overrides: Record<string, unknown> = {}) => ({
  id: ID,
  title: 'Backend Intern',
  description: 'Build APIs',
  level: 'INTERN',
  location: 'Ho Chi Minh City',
  industry: 'Technology',
  requirements: ['Node.js basics', 'Git'],
  benefits: ['Mentor', 'Lunch'],
  salaryMin: 300,
  salaryMax: 500,
  salaryHidden: false,
  createdAt: new Date('2026-11-02T03:04:05Z'),
  company: {
    id: 'c1',
    name: 'Acme',
    website: 'https://acme.test',
    logoUrl: 'https://acme.test/l.png',
  },
  stages: [
    {
      id: 's1',
      name: 'Screen',
      description: null,
      position: 1,
      format: 'PHONE',
      estimatedDurationMinutes: 20,
    },
    {
      id: 's2',
      name: 'Interview',
      description: null,
      position: 2,
      format: 'ONLINE',
      estimatedDurationMinutes: 45,
    },
  ],
  notes: [],
  ...overrides,
});
const findFirst = prisma.job.findFirst as any;

describe('GET /jobs/:id full detail', () => {
  const app = createApp();
  beforeEach(() => vi.clearAllMocks());

  it('returns requirements, benefits, industry, createdAt and the company summary', async () => {
    findFirst.mockResolvedValue(row());
    const res = await request(app).get(`/jobs/${ID}`);

    expect(res.status).toBe(200);
    expect(publicJobDetailSchema.safeParse(res.body).success).toBe(true);
    expect(res.body).toMatchObject({
      industry: 'Technology',
      requirements: ['Node.js basics', 'Git'],
      benefits: ['Mentor', 'Lunch'],
      createdAt: '2026-11-02T03:04:05.000Z',
      company: {
        id: 'c1',
        name: 'Acme',
        website: 'https://acme.test',
        logoUrl: 'https://acme.test/l.png',
      },
    });
  });

  it('orders stages by position', async () => {
    findFirst.mockResolvedValue(row());
    const res = await request(app).get(`/jobs/${ID}`);

    expect(findFirst.mock.calls[0][0].select.stages.orderBy).toEqual({ position: 'asc' });
    expect(res.body.stages.map((s: { position: number }) => s.position)).toEqual([1, 2]);
  });

  it('returns 404 for a non-published job', async () => {
    findFirst.mockResolvedValue(null);
    const res = await request(app).get(`/jobs/${ID}`);

    expect(res.status).toBe(404);
    expect(findFirst.mock.calls[0][0].where).toMatchObject({
      publicationStatus: 'PUBLISHED',
      company: { moderationStatus: 'APPROVED' },
    });
  });

  it('still hides a hidden salary', async () => {
    findFirst.mockResolvedValue(row({ salaryHidden: true }));
    const res = await request(app).get(`/jobs/${ID}`);

    expect(res.body.salary).toEqual({ negotiable: true, min: null, max: null });
    expect(JSON.stringify(res.body)).not.toContain('500');
  });
});
