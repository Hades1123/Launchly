import type { Prisma, PrismaClient } from '@/generated/prisma/client';
import { hashPassword } from '@/modules/auth/auth.crypto';
import { getStorageProvider, type StorageProvider } from '@/providers/storage';
import { SEED_PASSWORD, seedData, seedResumeFiles } from './data';
import { buildSamplePdf } from './sample-pdf';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', 'postgres']);

export function assertSeedAllowed(input: {
  nodeEnv: string | undefined;
  databaseUrl: string;
}): void {
  if (input.nodeEnv === 'production') {
    throw new Error('Refusing to seed: NODE_ENV is production.');
  }

  let hostname: string;
  try {
    hostname = new URL(input.databaseUrl).hostname;
  } catch {
    throw new Error('Refusing to seed: DATABASE_URL is not a valid URL.');
  }

  if (!LOCAL_HOSTS.has(hostname)) {
    throw new Error(
      `Refusing to seed: database host "${hostname}" is not local (allowed: ${[...LOCAL_HOSTS].join(', ')}).`,
    );
  }
}

type Tx = Prisma.TransactionClient;

async function upsertAll<T extends { id: string }>(
  rows: readonly T[],
  upsert: (args: { where: { id: string }; create: T; update: T }) => Promise<unknown>,
): Promise<number> {
  for (const row of rows) {
    await upsert({ where: { id: row.id }, create: row, update: row });
  }
  return rows.length;
}

export async function runSeed(
  prisma: PrismaClient,
  storage: StorageProvider = getStorageProvider(),
): Promise<Record<string, number>> {
  // Write the resume PDFs first so every seeded storageKey points at a real file.
  const fileSizes = new Map<string, number>();
  for (const file of seedResumeFiles) {
    const pdf = buildSamplePdf(file.lines);
    await storage.saveAs(file.storageKey, pdf);
    fileSizes.set(file.storageKey, pdf.length);
  }

  const passwordHash = await hashPassword(SEED_PASSWORD);
  const users = seedData.users.map((user) => ({ ...user, passwordHash }));
  const resumes = seedData.resumes.map((resume) => ({
    ...resume,
    sizeBytes: fileSizes.get(resume.storageKey) ?? resume.sizeBytes,
  }));

  return prisma.$transaction(
    async (tx: Tx) => ({
      users: await upsertAll(users, (a) => tx.user.upsert(a)),
      candidateProfiles: await upsertAll(seedData.candidateProfiles, (a) =>
        tx.candidateProfile.upsert(a),
      ),
      resumes: await upsertAll(resumes, (a) => tx.resume.upsert(a)),
      companies: await upsertAll(seedData.companies, (a) => tx.company.upsert(a)),
      jobs: await upsertAll(seedData.jobs, (a) => tx.job.upsert(a)),
      jobStages: await upsertAll(seedData.jobStages, (a) => tx.jobStage.upsert(a)),
      applications: await upsertAll(seedData.applications, (a) => tx.application.upsert(a)),
      applicationStatusHistory: await upsertAll(seedData.applicationStatusHistory, (a) =>
        tx.applicationStatusHistory.upsert(a),
      ),
      aiAssessments: await upsertAll(seedData.aiAssessments, (a) => tx.aiAssessment.upsert(a)),
      interviewQuestions: await upsertAll(seedData.interviewQuestions, (a) =>
        tx.interviewQuestion.upsert(a),
      ),
      interviewSessions: await upsertAll(seedData.interviewSessions, (a) =>
        tx.interviewSession.upsert(a),
      ),
      interviewAnswers: await upsertAll(seedData.interviewAnswers, (a) =>
        tx.interviewAnswer.upsert(a),
      ),
      notifications: await upsertAll(seedData.notifications, (a) => tx.notification.upsert(a)),
    }),
    { timeout: 30_000 },
  );
}
