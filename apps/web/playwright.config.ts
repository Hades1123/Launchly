import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests run against the local stack: PostgreSQL (`pnpm db:up`), migrated and
 * seeded (`pnpm db:migrate && pnpm db:seed`). The API (:4000) and the web app (:3000) are
 * started here unless they already run.
 */
export default defineConfig({
  testDir: './e2e',
  // One shared seeded database: keep specs sequential.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm --filter @launchly/api dev',
      cwd: '../..',
      url: 'http://localhost:4000/health',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'pnpm --filter @launchly/web dev',
      cwd: '../..',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
