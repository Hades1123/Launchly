import { execFileSync } from 'node:child_process';
import path from 'node:path';

const API_DIR = path.resolve(__dirname, '../../../api');

function reset(...args: string[]) {
  // `node` directly (no pnpm wrapper), like the API web server in playwright.config.ts.
  execFileSync('node', ['--import', 'tsx', 'prisma/e2e-reset.ts', ...args], {
    cwd: API_DIR,
    stdio: 'inherit',
  });
}

/** Clears the candidate's AI consent so the consent box shows again. */
export function resetAiConsent(email: string) {
  reset('consent', email);
}

/** Deletes the candidate's application to the job, so applying works again after a rerun. */
export function resetApplication(email: string, jobTitle: string) {
  reset('application', email, jobTitle);
}

/**
 * Puts the seeded pending and rejected companies and the seeded pending job back, removes
 * companies a spec registered, and deletes every job titled "E2E moderation …" (keep that
 * prefix for jobs only the moderation specs create).
 */
export function resetModeration() {
  reset('moderation');
}
