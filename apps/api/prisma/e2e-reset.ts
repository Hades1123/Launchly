import 'dotenv/config';
import { env } from '@/lib/env';
import { prisma } from '@/lib/prisma';
import { seedData } from './seed/data';
import { assertSeedAllowed } from './seed/run';

/**
 * Puts one piece of seeded state back so a Playwright spec can run again against the same
 * database. Local databases only (same guard as the seed).
 *
 *   consent <candidate email>               clear the AI consent
 *   application <candidate email> <title>   delete that candidate's application to the job
 *   moderation                              seeded companies and the pending job back to their moderation state
 *   practice <candidate email>              delete the candidate's interview practice sessions
 *   practice-expire <candidate email>       push the candidate's incomplete practice sessions past their deadline
 */
async function main(): Promise<void> {
  assertSeedAllowed({ nodeEnv: env.NODE_ENV, databaseUrl: env.DATABASE_URL });
  const [command, email, jobTitle] = process.argv.slice(2);

  if (command === 'consent' && email) {
    await prisma.candidateProfile.updateMany({
      where: { user: { email } },
      data: { aiConsentAcceptedAt: null },
    });
    return;
  }

  if (command === 'application' && email && jobTitle) {
    // History rows cascade with the application.
    await prisma.application.deleteMany({
      where: { candidate: { user: { email } }, job: { title: jobTitle } },
    });
    return;
  }

  if (command === 'practice' && email) {
    // Rounds, questions and answers cascade with the session.
    await prisma.interviewSession.deleteMany({
      where: { candidate: { user: { email } }, expiresAt: { not: null } },
    });
    return;
  }

  if (command === 'practice-expire' && email) {
    await prisma.interviewSession.updateMany({
      where: {
        candidate: { user: { email } },
        status: { not: 'COMPLETED' },
        expiresAt: { not: null },
      },
      data: { expiresAt: new Date(Date.now() - 60 * 60 * 1000) },
    });
    return;
  }

  if (command === 'moderation') {
    // "Draft Ventures" waits for review again; the rejected recruiter keeps only "QuickCash Jobs".
    await prisma.company.updateMany({
      where: { name: 'Draft Ventures' },
      data: {
        moderationStatus: 'PENDING',
        moderationReason: null,
        reviewedById: null,
        reviewedAt: null,
      },
    });
    await prisma.company.deleteMany({
      where: {
        owner: { email: 'recruiter.rejected@launchly.test' },
        name: { not: 'QuickCash Jobs' },
      },
    });
    // Jobs the SCRUM-74 spec submitted ("E2E moderation …"); rounds and notes cascade, while
    // applications would block the delete, so they go first.
    const specJobs = { title: { startsWith: 'E2E moderation' } };
    await prisma.application.deleteMany({ where: { job: specJobs } });
    await prisma.job.deleteMany({ where: specJobs });
    // The seeded pending job ("Thực tập sinh Product Designer") as seeded: no rounds, no notes.
    const pendingJob = seedData.jobs.find((job) => job.publicationStatus === 'PENDING');
    if (pendingJob) {
      await prisma.jobStage.deleteMany({ where: { jobId: pendingJob.id } });
      await prisma.jobNote.deleteMany({ where: { jobId: pendingJob.id } });
      await prisma.job.update({
        where: { id: pendingJob.id },
        // Fields the seed leaves out must be cleared too, or a resubmit's salary would survive.
        data: {
          salaryMin: null,
          salaryMax: null,
          ...pendingJob,
          reviewedById: null,
          reviewedAt: null,
        },
      });
    }
    return;
  }

  throw new Error(
    'Usage: e2e-reset.ts consent <email> | application <email> <job title> | moderation | practice <email> | practice-expire <email>',
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
