import type { PrismaClient } from '@/generated/prisma/client';

const HOUR_MS = 60 * 60 * 1000;

type Options = {
  now?: () => Date;
  /** Sessions deleted per query; the sweep repeats until the backlog is drained. */
  batchSize?: number;
  intervalMs?: number;
  log?: (message: string, ...details: string[]) => void;
};

/**
 * Deletes incomplete practice sessions (with their rounds, questions and answers, by cascade)
 * once their 24 h inactivity deadline has passed. Completed sessions and legacy sessions
 * without an `expiresAt` are never touched. Runs inside the API process: one sweep at start
 * (catching up after downtime), then one per hour while the process is healthy.
 */
export function createPracticeCleanup(prisma: PrismaClient, options: Options = {}) {
  const now = options.now ?? (() => new Date());
  const batchSize = options.batchSize ?? 100;
  const intervalMs = options.intervalMs ?? HOUR_MS;
  const log = options.log ?? ((message, ...details) => console.log(message, ...details));
  let timer: NodeJS.Timeout | undefined;

  /** Deletes every expired incomplete session and returns how many it removed. */
  async function sweep(): Promise<number> {
    const at = now();
    const expired = { status: { not: 'COMPLETED' as const }, expiresAt: { lte: at } };
    let total = 0;
    for (;;) {
      const batch = await prisma.interviewSession.findMany({
        where: expired,
        orderBy: { expiresAt: 'asc' },
        take: batchSize,
        select: { id: true },
      });
      if (batch.length === 0) break;
      // The guard is repeated so a session completed in the meantime, or deleted by another
      // API instance, is never removed or counted twice.
      const { count } = await prisma.interviewSession.deleteMany({
        where: { id: { in: batch.map((row) => row.id) }, ...expired },
      });
      total += count;
      if (batch.length < batchSize) break;
    }
    return total;
  }

  async function run(): Promise<void> {
    try {
      const deleted = await sweep();
      if (deleted > 0) log(`Interview practice cleanup deleted ${deleted} expired sessions`);
    } catch (error) {
      // Only the error type is logged: messages can carry query values such as answers.
      log('Interview practice cleanup failed', error instanceof Error ? error.name : 'unknown');
    }
  }

  return {
    sweep,
    start() {
      if (timer) return;
      void run();
      timer = setInterval(() => void run(), intervalMs);
      timer.unref();
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = undefined;
    },
  };
}
