/* eslint-disable @typescript-eslint/no-explicit-any */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://launchly:launchly@localhost:5433/launchly';
process.env.JWT_SECRET = 'change-me-at-least-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'change-me-too-at-least-32-characters';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '@/app';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => {
  const mockJob = {
    findMany: vi.fn(),
    count: vi.fn(),
  };

  return {
    prisma: {
      job: mockJob,
    },
  };
});

describe('Job Search and Filter Module', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  const mockApprovedJobs = [
    {
      id: 'job-1',
      title: 'Lập trình viên Frontend',
      titleNormalized: 'lap trinh vien frontend',
      level: 'FRESHER',
      location: 'Ho Chi Minh City',
      industry: 'Technology',
      requirements: ['React', 'TypeScript'],
      benefits: ['Mentorship'],
      salaryMin: 1000,
      salaryMax: 1500,
      salaryHidden: false,
      createdAt: new Date('2026-11-01T10:00:00Z'),
      company: {
        id: 'comp-1',
        name: 'Nimbus Tech',
        nameNormalized: 'nimbus tech',
        website: 'https://nimbus.test',
      },
    },
    {
      id: 'job-2',
      title: 'Thực tập sinh Marketing',
      titleNormalized: 'thuc tap sinh marketing',
      level: 'INTERN',
      location: 'Ha Noi',
      industry: 'Marketing',
      requirements: ['Communication'],
      benefits: ['Intern allowance'],
      salaryMin: 300,
      salaryMax: 500,
      salaryHidden: false,
      createdAt: new Date('2026-11-02T10:00:00Z'),
      company: {
        id: 'comp-2',
        name: 'Growth Agency',
        nameNormalized: 'growth agency',
        website: 'https://growth.test',
      },
    },
  ];

  it('GET /jobs returns public published jobs with pagination metadata', async () => {
    (prisma.job.findMany as any).mockResolvedValueOnce(mockApprovedJobs);
    (prisma.job.count as any).mockResolvedValueOnce(2);

    const res = await request(app).get('/jobs');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 2,
      totalPages: 1,
    });
    expect(res.body.data[0].title).toBe('Lập trình viên Frontend');
    expect(res.body.data[0].company.name).toBe('Nimbus Tech');

    // Verify public listing rule: PUBLISHED and APPROVED moderationStatus
    expect(prisma.job.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { publicationStatus: 'PUBLISHED' },
            { company: { moderationStatus: 'APPROVED' } },
          ]),
        }),
      }),
    );
  });

  it('filters by level (INTERN, FRESHER, SENIOR)', async () => {
    (prisma.job.findMany as any).mockResolvedValueOnce([mockApprovedJobs[1]]);
    (prisma.job.count as any).mockResolvedValueOnce(1);

    const res = await request(app).get('/jobs?level=INTERN');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].level).toBe('INTERN');

    expect(prisma.job.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([{ level: 'INTERN' }]),
        }),
      }),
    );
  });

  it('returns 400 when an invalid level is provided', async () => {
    const res = await request(app).get('/jobs?level=DIRECTOR');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('filters by industry and location combined', async () => {
    (prisma.job.findMany as any).mockResolvedValueOnce([mockApprovedJobs[0]]);
    (prisma.job.count as any).mockResolvedValueOnce(1);

    const res = await request(app).get('/jobs?industry=Technology&location=Ho+Chi+Minh+City');

    expect(res.status).toBe(200);
    expect(res.body.data[0].industry).toBe('Technology');

    expect(prisma.job.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { industry: { equals: 'Technology', mode: 'insensitive' } },
            { location: { contains: 'Ho Chi Minh City', mode: 'insensitive' } },
          ]),
        }),
      }),
    );
  });

  it('supports accent-tolerant Vietnamese search for keywords', async () => {
    (prisma.job.findMany as any).mockResolvedValueOnce([mockApprovedJobs[0]]);
    (prisma.job.count as any).mockResolvedValueOnce(1);

    // Searching unaccented "lap trinh" should match titleNormalized containing "lap trinh"
    const res = await request(app).get('/jobs?keyword=lap+trinh');

    expect(res.status).toBe(200);
    expect(prisma.job.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            {
              OR: expect.arrayContaining([
                { title: { contains: 'lap trinh', mode: 'insensitive' } },
                { titleNormalized: { contains: 'lap trinh' } },
                { company: { name: { contains: 'lap trinh', mode: 'insensitive' } } },
                { company: { nameNormalized: { contains: 'lap trinh' } } },
              ]),
            },
          ]),
        }),
      }),
    );
  });

  it('supports company name keyword search', async () => {
    (prisma.job.findMany as any).mockResolvedValueOnce([mockApprovedJobs[0]]);
    (prisma.job.count as any).mockResolvedValueOnce(1);

    const res = await request(app).get('/jobs?keyword=nimbus');

    expect(res.status).toBe(200);
    expect(prisma.job.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            {
              OR: expect.arrayContaining([
                { company: { name: { contains: 'nimbus', mode: 'insensitive' } } },
                { company: { nameNormalized: { contains: 'nimbus' } } },
              ]),
            },
          ]),
        }),
      }),
    );
  });

  it('handles empty results properly', async () => {
    (prisma.job.findMany as any).mockResolvedValueOnce([]);
    (prisma.job.count as any).mockResolvedValueOnce(0);

    const res = await request(app).get('/jobs?keyword=nonexistent');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    });
  });

  it('handles pagination parameters page and limit correctly', async () => {
    (prisma.job.findMany as any).mockResolvedValueOnce([]);
    (prisma.job.count as any).mockResolvedValueOnce(25);

    const res = await request(app).get('/jobs?page=2&limit=10');

    expect(res.status).toBe(200);
    expect(res.body.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
    });

    expect(prisma.job.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
      }),
    );
  });
});
