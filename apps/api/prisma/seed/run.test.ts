import { afterAll, describe, expect, it } from 'vitest';
import { assertSeedAllowed, runSeed } from './run';
import { seedData } from './data';

describe('assertSeedAllowed', () => {
  it('throws for production NODE_ENV', () => {
    expect(() =>
      assertSeedAllowed({
        nodeEnv: 'production',
        databaseUrl: 'postgresql://launchly:launchly@localhost:5433/launchly',
      }),
    ).toThrow();
  });

  it('throws for a non-local host', () => {
    expect(() =>
      assertSeedAllowed({
        nodeEnv: 'development',
        databaseUrl: 'postgresql://launchly:launchly@db.example.com:5432/launchly',
      }),
    ).toThrow();
  });

  it('allows localhost in development', () => {
    expect(() =>
      assertSeedAllowed({
        nodeEnv: 'development',
        databaseUrl: 'postgresql://launchly:launchly@localhost:5433/launchly',
      }),
    ).not.toThrow();
  });

  it('allows the compose host "postgres" in development', () => {
    expect(() =>
      assertSeedAllowed({
        nodeEnv: 'development',
        databaseUrl: 'postgresql://launchly:launchly@postgres:5432/launchly',
      }),
    ).not.toThrow();
  });
});

const expectedCounts: Record<string, number> = {
  users: seedData.users.length,
  candidateProfiles: seedData.candidateProfiles.length,
  resumes: seedData.resumes.length,
  companies: seedData.companies.length,
  jobs: seedData.jobs.length,
  jobStages: seedData.jobStages.length,
  jobNotes: seedData.jobNotes.length,
  applications: seedData.applications.length,
  applicationStatusHistory: seedData.applicationStatusHistory.length,
  aiAssessments: seedData.aiAssessments.length,
  interviewQuestions: seedData.interviewQuestions.length,
  interviewSessions: seedData.interviewSessions.length,
  interviewAnswers: seedData.interviewAnswers.length,
  notifications: seedData.notifications.length,
};

describe.runIf(process.env.RUN_DB_TESTS === '1')('runSeed (integration)', () => {
  let prisma: Awaited<ReturnType<typeof makeClient>>;

  async function makeClient() {
    const { PrismaClient } = await import('@/generated/prisma/client');
    const { PrismaPg } = await import('@prisma/adapter-pg');
    return new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
    });
  }

  afterAll(async () => {
    if (prisma) await prisma.$disconnect();
  });

  it('seeds every model with idempotent, restorable rows', async () => {
    prisma = await makeClient();

    const first = await runSeed(prisma);
    expect(first).toEqual(expectedCounts);

    const seededAdmin = seedData.users.find((u) => u.role === 'ADMIN')!;
    await prisma.user.update({
      where: { id: seededAdmin.id },
      data: { fullName: 'Edited Name' },
    });

    const second = await runSeed(prisma);
    expect(second).toEqual(expectedCounts);

    const restored = await prisma.user.findUniqueOrThrow({
      where: { id: seededAdmin.id },
    });
    expect(restored.fullName).toBe(seededAdmin.fullName);
  });
});
