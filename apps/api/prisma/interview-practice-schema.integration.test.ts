/**
 * SCRUM-63: job-linked interview practice sessions.
 * - The migration SQL runs in a rolled-back transaction on a scratch schema that holds the old
 *   `InterviewSession` shape, to prove legacy rows survive and get their candidate and job.
 * - The round trip tests use the migrated test database and clean up what they create.
 *
 * Run: RUN_DB_TESTS=1 pnpm --filter @launchly/api exec vitest run prisma/interview-practice-schema.integration.test.ts
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PrismaClient } from '@/generated/prisma/client';

const MIGRATION_SQL = readFileSync(
  fileURLToPath(
    new URL(
      './migrations/20261113120000_interview_practice_sessions/migration.sql',
      import.meta.url,
    ),
  ),
  'utf8',
);

/** The state before the migration: only the tables the migration touches or points at. */
const OLD_STATE = [
  `CREATE TYPE "InterviewSessionStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED')`,
  `CREATE TABLE "CandidateProfile" ("id" TEXT PRIMARY KEY)`,
  `CREATE TABLE "Job" ("id" TEXT PRIMARY KEY)`,
  `CREATE TABLE "JobStage" ("id" TEXT PRIMARY KEY)`,
  `CREATE TABLE "Application" ("id" TEXT PRIMARY KEY, "candidateId" TEXT NOT NULL, "jobId" TEXT NOT NULL)`,
  `CREATE TABLE "InterviewSession" (
     "id" TEXT PRIMARY KEY,
     "applicationId" TEXT NOT NULL REFERENCES "Application"("id"),
     "status" "InterviewSessionStatus" NOT NULL DEFAULT 'NOT_STARTED',
     "startedAt" TIMESTAMP(3),
     "completedAt" TIMESTAMP(3),
     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     "updatedAt" TIMESTAMP(3) NOT NULL
   )`,
  `CREATE INDEX "InterviewSession_applicationId_idx" ON "InterviewSession"("applicationId")`,
];

function statements(sql: string): string[] {
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

class Rollback extends Error {}

async function makeClient() {
  const { PrismaClient } = await import('@/generated/prisma/client');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });
}

describe.runIf(process.env.RUN_DB_TESTS === '1')('interview practice schema (integration)', () => {
  let prisma: PrismaClient;
  const suffix = Date.now().toString(36);
  const ids: {
    candidateUser?: string;
    recruiterUser?: string;
    company?: string;
    job?: string;
    stage?: string;
    candidate?: string;
    sessions: string[];
  } = { sessions: [] };

  beforeAll(async () => {
    prisma = await makeClient();
    // Guard: only ever touch the test database.
    expect(process.env.DATABASE_URL).toContain('launchly_test');
    const candidateUser = await prisma.user.create({
      data: { email: `practice-c-${suffix}@example.com`, role: 'CANDIDATE' },
    });
    const recruiterUser = await prisma.user.create({
      data: { email: `practice-r-${suffix}@example.com`, role: 'RECRUITER' },
    });
    const candidate = await prisma.candidateProfile.create({
      data: { userId: candidateUser.id },
    });
    const company = await prisma.company.create({
      data: { ownerId: recruiterUser.id, name: `Practice Co ${suffix}` },
    });
    const job = await prisma.job.create({
      data: {
        companyId: company.id,
        createdById: recruiterUser.id,
        title: 'Practice job',
        description: 'Build things',
        location: 'Remote',
        publicationStatus: 'PUBLISHED',
      },
    });
    const stage = await prisma.jobStage.create({
      data: { jobId: job.id, name: 'Phone screen', position: 1, format: 'PHONE' },
    });
    Object.assign(ids, {
      candidateUser: candidateUser.id,
      recruiterUser: recruiterUser.id,
      company: company.id,
      job: job.id,
      stage: stage.id,
      candidate: candidate.id,
    });
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.interviewSession.deleteMany({ where: { id: { in: ids.sessions } } });
    await prisma.jobStage.deleteMany({ where: { jobId: ids.job } });
    await prisma.job.deleteMany({ where: { id: ids.job } });
    await prisma.company.deleteMany({ where: { id: ids.company } });
    await prisma.candidateProfile.deleteMany({ where: { id: ids.candidate } });
    await prisma.user.deleteMany({
      where: { id: { in: [ids.candidateUser!, ids.recruiterUser!] } },
    });
    await prisma.$disconnect();
  });

  it('allows a session with a job and no application', async () => {
    const session = await prisma.interviewSession.create({
      data: { candidateId: ids.candidate!, jobId: ids.job!, scope: 'FULL' },
    });
    ids.sessions.push(session.id);

    expect(session.applicationId).toBeNull();
    expect(session.candidateId).toBe(ids.candidate);
    expect(session.jobId).toBe(ids.job);
    expect(session.status).toBe('NOT_STARTED');
  });

  it('keeps a legacy application-linked session and backfills candidate and job', async () => {
    const scratch = await makeClient();
    let row: Record<string, unknown> | undefined;
    await scratch
      .$transaction(async (tx) => {
        await tx.$executeRawUnsafe('CREATE SCHEMA "mig_practice"');
        await tx.$executeRawUnsafe('SET LOCAL search_path TO "mig_practice"');
        for (const sql of OLD_STATE) await tx.$executeRawUnsafe(sql);
        await tx.$executeRawUnsafe(`INSERT INTO "CandidateProfile" ("id") VALUES ('cand-1')`);
        await tx.$executeRawUnsafe(`INSERT INTO "Job" ("id") VALUES ('job-1')`);
        await tx.$executeRawUnsafe(
          `INSERT INTO "Application" ("id", "candidateId", "jobId") VALUES ('app-1', 'cand-1', 'job-1')`,
        );
        await tx.$executeRawUnsafe(
          `INSERT INTO "InterviewSession" ("id", "applicationId", "status", "updatedAt")
             VALUES ('sess-1', 'app-1', 'COMPLETED', CURRENT_TIMESTAMP)`,
        );
        for (const sql of statements(MIGRATION_SQL)) await tx.$executeRawUnsafe(sql);
        const rows = await tx.$queryRawUnsafe<Record<string, unknown>[]>(
          `SELECT "id", "applicationId", "candidateId", "jobId", "scope", "status", "expiresAt", "interviewConsentAt"
             FROM "InterviewSession"`,
        );
        row = rows[0];
        throw new Rollback();
      })
      .catch((error: unknown) => {
        if (!(error instanceof Rollback)) throw error;
      });
    await scratch.$disconnect();

    expect(row).toMatchObject({
      id: 'sess-1',
      applicationId: 'app-1',
      candidateId: 'cand-1',
      jobId: 'job-1',
      scope: 'FULL',
      status: 'COMPLETED',
      expiresAt: null,
      interviewConsentAt: null,
    });
  });

  it('round-trips rounds, questions with source, answers, feedback, consent, status and expiry', async () => {
    const consentAt = new Date('2026-11-13T10:00:00.000Z');
    const expiresAt = new Date('2026-11-14T10:00:00.000Z');
    const created = await prisma.interviewSession.create({
      data: {
        candidateId: ids.candidate!,
        jobId: ids.job!,
        scope: 'ROUND',
        status: 'IN_PROGRESS',
        interviewConsentAt: consentAt,
        expiresAt,
        summary: 'Solid overall',
        rounds: {
          create: {
            stageId: ids.stage,
            name: 'Phone screen',
            position: 1,
            status: 'IN_PROGRESS',
            feedback: 'Good pace',
            questions: {
              create: {
                position: 1,
                prompt: 'Tell me about a project',
                source: 'JOB_DESCRIPTION',
                answer: {
                  create: { answer: 'I built a table', feedback: 'Be specific' },
                },
              },
            },
          },
        },
      },
    });
    ids.sessions.push(created.id);

    const loaded = await prisma.interviewSession.findUniqueOrThrow({
      where: { id: created.id },
      include: { rounds: { include: { questions: { include: { answer: true } } } } },
    });

    expect(loaded).toMatchObject({
      status: 'IN_PROGRESS',
      interviewConsentAt: consentAt,
      expiresAt,
      summary: 'Solid overall',
    });
    const round = loaded.rounds[0]!;
    expect(round).toMatchObject({
      stageId: ids.stage,
      name: 'Phone screen',
      status: 'IN_PROGRESS',
    });
    const question = round.questions[0]!;
    expect(question).toMatchObject({
      prompt: 'Tell me about a project',
      source: 'JOB_DESCRIPTION',
    });
    expect(question.answer).toMatchObject({ answer: 'I built a table', feedback: 'Be specific' });
  });

  it('stores no score on practice answers; the legacy answer table keeps its own', async () => {
    const rows = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.columns
      WHERE column_name = 'score'
        AND table_name IN ('InterviewPracticeAnswer', 'InterviewAnswer')
        AND table_schema = current_schema()`;

    expect(rows.map((row) => row.table_name)).toEqual(['InterviewAnswer']);
  });

  it('cascades rounds, questions and answers when the session is deleted', async () => {
    const session = await prisma.interviewSession.create({
      data: {
        candidateId: ids.candidate!,
        jobId: ids.job!,
        scope: 'FULL',
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
      },
      include: { rounds: { include: { questions: true } } },
    });
    const questionId = session.rounds[0]!.questions[0]!.id;

    await prisma.interviewSession.delete({ where: { id: session.id } });

    expect(await prisma.interviewPracticeRound.count({ where: { sessionId: session.id } })).toBe(0);
    expect(await prisma.interviewPracticeQuestion.count({ where: { id: questionId } })).toBe(0);
    expect(await prisma.interviewPracticeAnswer.count({ where: { questionId } })).toBe(0);
  });

  it('creates no recruiter-authored InterviewQuestion rows for generated questions', async () => {
    const before = await prisma.interviewQuestion.count({ where: { jobId: ids.job } });
    const session = await prisma.interviewSession.create({
      data: {
        candidateId: ids.candidate!,
        jobId: ids.job!,
        scope: 'FULL',
        rounds: {
          create: {
            name: 'R1',
            position: 1,
            questions: { create: { position: 1, prompt: 'Q', source: 'JOB_DESCRIPTION' } },
          },
        },
      },
    });
    ids.sessions.push(session.id);

    expect(await prisma.interviewQuestion.count({ where: { jobId: ids.job } })).toBe(before);
  });
});
