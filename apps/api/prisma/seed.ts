import 'dotenv/config';
import { env } from '@/lib/env';
import { prisma } from '@/lib/prisma';
import { assertSeedAllowed, runSeed } from './seed/run';

async function main(): Promise<void> {
  assertSeedAllowed({ nodeEnv: env.NODE_ENV, databaseUrl: env.DATABASE_URL });

  const counts = await runSeed(prisma);
  for (const [model, count] of Object.entries(counts)) {
    console.log(`seeded ${model}: ${count}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
