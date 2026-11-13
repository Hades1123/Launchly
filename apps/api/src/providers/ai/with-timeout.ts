import { AppError } from '@/lib/app-error';

/** A slow provider is cut off after this long and reported as `AI_UNAVAILABLE`. */
export const AI_TIMEOUT_MS = 30_000;

/** Rejects after `ms`; the timer is always cleared so a fast answer leaves nothing behind. */
export async function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new AppError('AI_UNAVAILABLE', `The AI timed out after ${ms / 1000} s`)),
      ms,
    );
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
