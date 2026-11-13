import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { SaveJobInput } from '@launchly/shared';
import type { PrismaClient } from '@/generated/prisma/client';
import { createRecruiterJobService } from '@/modules/job/recruiter-job.service';
import { AppError } from '@/lib/app-error';

const draft: SaveJobInput = {
  action: 'DRAFT',
  title: 'Bản nháp tích hợp',
  description: 'Sẽ viết thêm.',
  level: 'FRESHER',
  location: 'Remote',
  industry: null,
  requirements: [],
  benefits: [],
  salary: { hidden: false, min: null, max: null },
  rounds: [{ name: 'Sàng lọc', format: null, estimatedDurationMinutes: null }],
  notes: ['Ghi chú cũ'],
};

const submit: SaveJobInput = {
  ...draft,
  action: 'SUBMIT',
  industry: 'Technology',
  salary: { hidden: true, min: null, max: null },
  rounds: [
    { name: 'Bài test', format: 'ASSIGNMENT', estimatedDurationMinutes: 120 },
    { name: 'Phỏng vấn', format: 'ONSITE', estimatedDurationMinutes: 60 },
  ],
  notes: ['Mang laptop', 'Đến sớm 10 phút'],
};

describe.runIf(process.env.RUN_DB_TESTS === '1')('recruiter jobs (integration)', () => {
  let prisma: PrismaClient;
  const suffix = Date.now().toString(36);
  const userIds: string[] = [];
  let ownerId: string;
  let strangerId: string;

  beforeAll(async () => {
    const { PrismaClient } = await import('@/generated/prisma/client');
    const { PrismaPg } = await import('@prisma/adapter-pg');
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
    });
    for (const name of ['owner', 'stranger']) {
      const user = await prisma.user.create({
        data: { email: `post-job-${name}-${suffix}@example.com`, role: 'RECRUITER' },
      });
      userIds.push(user.id);
      await prisma.company.create({
        data: {
          ownerId: user.id,
          name: `Post Job ${name} ${suffix}`,
          moderationStatus: 'APPROVED',
        },
      });
    }
    [ownerId, strangerId] = userIds as [string, string];
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.job.deleteMany({ where: { createdById: { in: userIds } } });
    await prisma.company.deleteMany({ where: { ownerId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it('saves a draft, then submits it with the rounds and notes exactly as arranged', async () => {
    const service = createRecruiterJobService(prisma);

    const saved = await service.create(ownerId, draft);
    expect(saved.status).toBe('DRAFT');
    expect(await service.list(strangerId)).toEqual([]);

    const submitted = await service.update(saved.id, ownerId, submit);
    expect(submitted.status).toBe('PENDING');
    expect(submitted.rounds.map((r) => [r.name, r.format, r.position])).toEqual([
      ['Bài test', 'ASSIGNMENT', 1],
      ['Phỏng vấn', 'ONSITE', 2],
    ]);
    expect(submitted.notes.map((n) => [n.content, n.position])).toEqual([
      ['Mang laptop', 1],
      ['Đến sớm 10 phút', 2],
    ]);
    expect(await prisma.jobStage.count({ where: { jobId: saved.id } })).toBe(2);
    expect(await prisma.jobNote.count({ where: { jobId: saved.id } })).toBe(2);

    const stored = await prisma.job.findUniqueOrThrow({ where: { id: saved.id } });
    expect(stored).toMatchObject({ salaryHidden: true, salaryMin: null, salaryMax: null });
  });

  it('refuses to edit a submitted job or a job of another recruiter', async () => {
    const service = createRecruiterJobService(prisma);
    const job = await service.create(ownerId, submit);

    await expect(service.update(job.id, ownerId, draft)).rejects.toMatchObject({
      code: 'CONFLICT',
    });
    await expect(service.get(job.id, strangerId)).rejects.toBeInstanceOf(AppError);
    await expect(service.update(job.id, strangerId, draft)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
});
