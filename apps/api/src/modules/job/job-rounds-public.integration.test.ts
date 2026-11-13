import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PrismaClient } from '@/generated/prisma/client';
import { JobService } from '@/modules/job/job.service';
import { createJobRoundsService } from '@/modules/job/job-rounds.service';

describe.runIf(process.env.RUN_DB_TESTS === '1')(
  'rounds in the public job detail (integration)',
  () => {
    let prisma: PrismaClient;
    let jobId: string;
    let userId: string;
    let companyId: string;
    const suffix = Date.now().toString(36);

    beforeAll(async () => {
      const { PrismaClient } = await import('@/generated/prisma/client');
      const { PrismaPg } = await import('@prisma/adapter-pg');
      prisma = new PrismaClient({
        adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
      });
      const user = await prisma.user.create({
        data: { email: `public-rounds-${suffix}@example.com`, role: 'RECRUITER' },
      });
      userId = user.id;
      const company = await prisma.company.create({
        data: { ownerId: userId, name: `Public Rounds Co ${suffix}`, moderationStatus: 'APPROVED' },
      });
      companyId = company.id;
      const job = await prisma.job.create({
        data: {
          companyId,
          createdById: userId,
          title: 'Public rounds job',
          description: 'd',
          level: 'FRESHER',
          location: 'Remote',
          publicationStatus: 'PUBLISHED',
        },
      });
      jobId = job.id;
    });

    afterAll(async () => {
      if (!prisma) return;
      await prisma.job.delete({ where: { id: jobId } });
      await prisma.company.delete({ where: { id: companyId } });
      await prisma.user.delete({ where: { id: userId } });
      await prisma.$disconnect();
    });

    it('rounds saved by the recruiter appear in the public detail with format and duration', async () => {
      await createJobRoundsService(prisma).replace(jobId, userId, {
        rounds: [
          { name: 'Phone screen', format: 'PHONE', estimatedDurationMinutes: 20 },
          { name: 'Take-home task', format: 'ASSIGNMENT', estimatedDurationMinutes: 180 },
        ],
      });

      const detail = await new JobService(prisma).getPublicJobById(jobId);

      expect(
        detail.stages.map((s) => [s.name, s.position, s.format, s.estimatedDurationMinutes]),
      ).toEqual([
        ['Phone screen', 1, 'PHONE', 20],
        ['Take-home task', 2, 'ASSIGNMENT', 180],
      ]);
    });
  },
);
