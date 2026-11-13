/**
 * SCRUM-66: the cleanup deletes expired incomplete practice sessions with their rounds, questions
 * and answers, and nothing else. Runs against the migrated test database and removes what it creates.
 *
 * Run: RUN_DB_TESTS=1 pnpm --filter @launchly/api exec vitest run src/modules/interview-practice/interview-practice.cleanup.integration.test.ts
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PrismaClient } from '@/generated/prisma/client';
import { createPracticeCleanup } from '@/modules/interview-practice/interview-practice.cleanup';

const HOUR = 60 * 60 * 1000;

describe.runIf(process.env.RUN_DB_TESTS === '1')('practice cleanup (integration)', () => {
  let prisma: PrismaClient;
  const suffix = Date.now().toString(36);
  const created: string[] = [];
  let userIds: string[] = [];
  let companyId: string;
  let jobId: string;
  let candidateId: string;
  const now = new Date();

  const session = async (
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED',
    expiresAt: Date | null,
    withChildren = false,
  ) => {
    const row = await prisma.interviewSession.create({
      data: {
        candidateId,
        jobId,
        status,
        expiresAt,
        ...(withChildren
          ? {
              rounds: {
                create: {
                  name: 'R1',
                  position: 1,
                  questions: {
                    create: {
                      position: 1,
                      prompt: 'Q',
                      source: 'JOB_DESCRIPTION',
                      answer: { create: { answer: 'A' } },
                    },
                  },
                },
              },
            }
          : {}),
      },
    });
    created.push(row.id);
    return row.id;
  };
  const exists = async (id: string) =>
    (await prisma.interviewSession.count({ where: { id } })) === 1;

  beforeAll(async () => {
    const { PrismaClient } = await import('@/generated/prisma/client');
    const { PrismaPg } = await import('@prisma/adapter-pg');
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
    });
    // Guard: the cleanup deletes rows by deadline, so only ever run it on the test database.
    expect(process.env.DATABASE_URL).toContain('launchly_test');
    const candidateUser = await prisma.user.create({
      data: { email: `cleanup-c-${suffix}@example.com`, role: 'CANDIDATE' },
    });
    const recruiter = await prisma.user.create({
      data: { email: `cleanup-r-${suffix}@example.com`, role: 'RECRUITER' },
    });
    userIds = [candidateUser.id, recruiter.id];
    candidateId = (await prisma.candidateProfile.create({ data: { userId: candidateUser.id } })).id;
    companyId = (
      await prisma.company.create({ data: { ownerId: recruiter.id, name: `Cleanup Co ${suffix}` } })
    ).id;
    jobId = (
      await prisma.job.create({
        data: {
          companyId,
          createdById: recruiter.id,
          title: 'Cleanup job',
          description: 'd',
          location: 'Remote',
        },
      })
    ).id;
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.interviewSession.deleteMany({ where: { id: { in: created } } });
    await prisma.job.deleteMany({ where: { id: jobId } });
    await prisma.company.deleteMany({ where: { id: companyId } });
    await prisma.candidateProfile.deleteMany({ where: { id: candidateId } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it('deletes expired incomplete sessions with their rounds, questions and answers', async () => {
    const expired = await session('IN_PROGRESS', new Date(now.getTime() - HOUR), true);
    const questions = await prisma.interviewPracticeQuestion.findMany({
      where: { round: { sessionId: expired } },
      select: { id: true },
    });

    const deleted = await createPracticeCleanup(prisma, { now: () => now }).sweep();

    expect(deleted).toBeGreaterThanOrEqual(1);
    expect(await exists(expired)).toBe(false);
    expect(await prisma.interviewPracticeRound.count({ where: { sessionId: expired } })).toBe(0);
    expect(
      await prisma.interviewPracticeAnswer.count({
        where: { questionId: { in: questions.map((q) => q.id) } },
      }),
    ).toBe(0);
  });

  it('keeps completed sessions, legacy rows without expiry and sessions still in time', async () => {
    const deadline = new Date(now.getTime() - HOUR);
    const completed = await session('COMPLETED', deadline, true);
    const legacy = await session('IN_PROGRESS', null);
    const active = await session('IN_PROGRESS', new Date(now.getTime() + HOUR));
    const expired = await session('NOT_STARTED', deadline);

    await createPracticeCleanup(prisma, { now: () => now }).sweep();

    expect(await exists(completed)).toBe(true);
    expect(await prisma.interviewPracticeRound.count({ where: { sessionId: completed } })).toBe(1);
    expect(await exists(legacy)).toBe(true);
    expect(await exists(active)).toBe(true);
    expect(await exists(expired)).toBe(false);
  });

  it('catches up overdue sessions on the first sweep, and a repeated or concurrent sweep is a no-op', async () => {
    const overdue = await Promise.all(
      Array.from({ length: 3 }, (_, i) =>
        session('IN_PROGRESS', new Date(now.getTime() - (i + 2) * 24 * HOUR)),
      ),
    );
    const cleanup = createPracticeCleanup(prisma, { now: () => now, batchSize: 2 });

    const [a, b] = await Promise.all([cleanup.sweep(), cleanup.sweep()]);

    expect(a + b).toBeGreaterThanOrEqual(3);
    for (const id of overdue) expect(await exists(id)).toBe(false);
    expect(await cleanup.sweep()).toBe(0);
  });
});
