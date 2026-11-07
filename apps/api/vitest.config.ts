import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    setupFiles: ['./src/test-setup.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5433/launchly_test',
      JWT_SECRET: 'test-jwt-secret-at-least-32-characters-long',
      JWT_REFRESH_SECRET: 'test-jwt-refresh-secret-at-least-32-characters-long',
    },
  },
});
