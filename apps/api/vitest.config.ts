import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/generated/**',
        'src/**/*.test.ts',
        'src/**/__fixtures__/**',
        'src/test-setup.ts',
      ],
      reporter: ['text-summary', 'json-summary', 'json'],
    },
    setupFiles: ['./src/test-setup.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5433/launchly_test',
      JWT_SECRET: 'test-jwt-secret-at-least-32-characters-long',
      JWT_REFRESH_SECRET: 'test-jwt-refresh-secret-at-least-32-characters-long',
    },
  },
});
