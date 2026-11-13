import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@/generated/prisma/client';
import { AppError } from '@/lib/app-error';
import { createAdminJobService } from '@/modules/admin/admin-job.service';
import { JobService } from '@/modules/job/job.service';

describe.runIf(process.env.RUN_DB_TESTS === '1')('admin job decisions (integration)', () => {
  let prisma: PrismaClient;
  let adminId: string;
  let companyId: string;
  let recruiterId: string;
  // Every row this test creates hangs off users with this unique email ending.
  const ending = `${Date.now().toString(36)}-jobmod@example.com`;

  async function pendingJob(title: string) {
    return (
      await prisma.job.create({
        data: {
          companyId,
          createdById: recruiterId,
          title,
          description: 'd',
          level: 'INTERN',
          location: 'Remote',
          publicationStatus: 'PENDING',
        },
      })
    ).id;
  }

  beforeAll(async () => {
    const { PrismaClient } = await import('@/generated/prisma/client');
    const { PrismaPg } = await import('@prisma/adapter-pg');
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
    });
    recruiterId = (
      await prisma.user.create({ data: { email: `owner-${ending}`, role: 'RECRUITER' } })
    ).id;
    adminId = (await prisma.user.create({ data: { email: `admin-${ending}`, role: 'ADMIN' } })).id;
    companyId = (
      await prisma.company.create({
        data: { ownerId: recruiterId, name: `Job Mod Co ${ending}`, moderationStatus: 'APPROVED' },
      })
    ).id;
  });

  afterAll(async () => {
    if (!prisma) return;
    const mine = { endsWith: ending };
    await prisma.job.deleteMany({ where: { createdBy: { email: mine } } });
    await prisma.company.deleteMany({ where: { owner: { email: mine } } });
    await prisma.user.deleteMany({ where: { email: mine } });
    await prisma.$disconnect();
  });

  it('applies exactly one of two concurrent approvals, then candidates can open the job (E1, FR-008)', async () => {
    const service = createAdminJobService(prisma, { send: vi.fn(async () => undefined) });
    const jobId = await pendingJob('Concurrent approvals');

    const results = await Promise.allSettled([
      service.approve(jobId, adminId),
      service.approve(jobId, adminId),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const failed = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect((failed.reason as AppError).code).toBe('CONFLICT');

    const stored = await prisma.job.findUniqueOrThrow({ where: { id: jobId } });
    expect(stored.publicationStatus).toBe('PUBLISHED');
    expect(stored.reviewedById).toBe(adminId);
    expect(stored.reviewedAt).toBeInstanceOf(Date);
    await expect(new JobService(prisma).getPublicJobById(jobId)).resolves.toMatchObject({
      id: jobId,
    });
  });

  it('keeps a rejected job away from candidates', async () => {
    const service = createAdminJobService(prisma, { send: vi.fn(async () => undefined) });
    const jobId = await pendingJob('Rejected job');

    await service.reject(jobId, adminId, 'Not entry level');

    await expect(new JobService(prisma).getPublicJobById(jobId)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});
