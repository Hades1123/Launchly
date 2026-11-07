import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PrismaClient } from '@/generated/prisma/client';
import { createJobRoundsService } from '@/modules/job/job-rounds.service';
import { AppError } from '@/lib/app-error';

const round = (name: string, id?: string) => ({
  ...(id ? { id } : {}),
  name,
  format: 'ONLINE' as const,
  estimatedDurationMinutes: 30,
});

describe.runIf(process.env.RUN_DB_TESTS === '1')('job rounds (integration)', () => {
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
      data: { email: `rounds-${suffix}@example.com`, role: 'RECRUITER' },
    });
    userId = user.id;
    const company = await prisma.company.create({
      data: { ownerId: userId, name: `Rounds Co ${suffix}` },
    });
    companyId = company.id;
    const job = await prisma.job.create({
      data: {
        companyId,
        createdById: userId,
        title: 'Rounds job',
        description: 'd',
        level: 'FRESHER',
        location: 'Remote',
      },
    });
    jobId = job.id;
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.application.deleteMany({ where: { jobId } });
    await prisma.job.delete({ where: { id: jobId } });
    await prisma.company.delete({ where: { id: companyId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it('creates, reorders, edits and deletes rounds with gapless positions', async () => {
    const service = createJobRoundsService(prisma);

    const created = await service.replace(jobId, userId, {
      rounds: [round('A'), round('B'), round('C')],
    });
    expect(created.map((r) => [r.name, r.position])).toEqual([
      ['A', 1],
      ['B', 2],
      ['C', 3],
    ]);

    const [a, b, c] = created as [(typeof created)[0], (typeof created)[0], (typeof created)[0]];
    const reordered = await service.replace(jobId, userId, {
      rounds: [round('C2', c.id), round('A', a.id)],
    });
    expect(reordered.map((r) => [r.id, r.name, r.position])).toEqual([
      [c.id, 'C2', 1],
      [a.id, 'A', 2],
    ]);
    expect((await service.list(jobId, userId)).map((r) => r.id)).toEqual([c.id, a.id]);
    expect(await prisma.jobStage.findUnique({ where: { id: b.id } })).toBeNull();
  });

  it('refuses to delete a round that applications reference, and leaves the list intact', async () => {
    const service = createJobRoundsService(prisma);
    const [first] = await service.list(jobId, userId);

    const candidateUser = await prisma.user.create({
      data: { email: `cand-${suffix}@example.com`, role: 'CANDIDATE' },
    });
    const profile = await prisma.candidateProfile.create({ data: { userId: candidateUser.id } });
    const resume = await prisma.resume.create({
      data: {
        candidateId: profile.id,
        fileName: 'cv.pdf',
        storageKey: `rounds-${suffix}.pdf`,
        contentType: 'application/pdf',
        sizeBytes: 1,
      },
    });
    const application = await prisma.application.create({
      data: { candidateId: profile.id, jobId, resumeId: resume.id, currentStageId: first!.id },
    });

    try {
      await expect(service.replace(jobId, userId, { rounds: [] })).rejects.toBeInstanceOf(AppError);
      const after = await service.list(jobId, userId);
      expect(after.length).toBe(2);
      const kept = await prisma.application.findUniqueOrThrow({ where: { id: application.id } });
      expect(kept.currentStageId).toBe(first!.id);
    } finally {
      await prisma.application.delete({ where: { id: application.id } });
      await prisma.resume.delete({ where: { id: resume.id } });
      await prisma.candidateProfile.delete({ where: { id: profile.id } });
      await prisma.user.delete({ where: { id: candidateUser.id } });
    }
  });

  it('refuses a recruiter who does not manage the job', async () => {
    const service = createJobRoundsService(prisma);
    await expect(
      service.replace(jobId, '00000000-0000-4000-8000-00000000dead', { rounds: [] }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
