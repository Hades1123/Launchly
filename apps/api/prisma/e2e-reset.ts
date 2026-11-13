import 'dotenv/config';
import { env } from '@/lib/env';
import { prisma } from '@/lib/prisma';
import { assertSeedAllowed } from './seed/run';

/**
 * Puts one piece of seeded state back so a Playwright spec can run again against the same
 * database. Local databases only (same guard as the seed).
 *
 *   consent <candidate email>               clear the AI consent
 *   application <candidate email> <title>   delete that candidate's application to the job
 *   moderation                              seeded companies back to their moderation state
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
    return;
  }

  throw new Error(
    'Usage: e2e-reset.ts consent <email> | application <email> <job title> | moderation',
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
