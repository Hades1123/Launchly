import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests run against the local stack: PostgreSQL (`pnpm db:up`), migrated and
 * seeded (`pnpm db:migrate && pnpm db:seed`).
 *
 * The API and the web app start on dedicated ports so a dev server (or another project)
 * on :3000 / :4000 is never mistaken for the app under test. If either port is already in
 * use, the run fails instead of reusing it.
 */
const WEB_PORT = 3100;
const API_PORT = 4100;
const WEB_URL = `http://localhost:${WEB_PORT}`;
const API_URL = `http://localhost:${API_PORT}`;

export default defineConfig({
  testDir: './e2e',
  // One shared seeded database: keep specs sequential.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: WEB_URL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Servers are started with `node` directly (no pnpm wrapper), so Playwright can stop them
  // cleanly and the run exits when the tests finish.
  webServer: [
    {
      command: 'node --import tsx src/server.ts',
      cwd: '../api',
      url: `${API_URL}/health`,
      env: {
        PORT: String(API_PORT),
        CORS_ORIGIN: WEB_URL,
        APP_URL: WEB_URL,
        // The CV fit check runs against the deterministic mock AI, never a live key.
        AI_DRIVER: 'mock',
        // Specs sign in once per test; the default 10 per 2 minutes would throttle them.
        LOGIN_RATE_LIMIT: '1000',
      },
      reuseExistingServer: false,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
      timeout: 120_000,
    },
    {
      command: `node node_modules/next/dist/bin/next dev -p ${WEB_PORT}`,
      url: WEB_URL,
      env: { API_URL },
      reuseExistingServer: false,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
      timeout: 120_000,
    },
  ],
});
