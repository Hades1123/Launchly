import 'dotenv/config';
import { createApp } from '@/app';
import { env } from '@/lib/env';
import { prisma } from '@/lib/prisma';
import { createPracticeCleanup } from '@/modules/interview-practice/interview-practice.cleanup';

const server = createApp().listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});

if (env.PRACTICE_CLEANUP_ENABLED) {
  const cleanup = createPracticeCleanup(prisma);
  cleanup.start();
  server.on('close', cleanup.stop);
}
