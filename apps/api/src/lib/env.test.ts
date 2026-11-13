import { describe, expect, it } from 'vitest';
import { envSchema } from '@/lib/env';

const base = {
  DATABASE_URL: 'postgresql://launchly:launchly@localhost:5433/launchly_test',
  JWT_SECRET: 'test-jwt-secret-at-least-32-characters-long',
  JWT_REFRESH_SECRET: 'test-jwt-refresh-secret-at-least-32-characters-long',
};

describe('envSchema', () => {
  it('turns the practice cleanup on by default', () => {
    expect(envSchema.parse(base).PRACTICE_CLEANUP_ENABLED).toBe(true);
  });

  it('reads PRACTICE_CLEANUP_ENABLED from a string', () => {
    expect(
      envSchema.parse({ ...base, PRACTICE_CLEANUP_ENABLED: 'false' }).PRACTICE_CLEANUP_ENABLED,
    ).toBe(false);
    expect(
      envSchema.parse({ ...base, PRACTICE_CLEANUP_ENABLED: 'true' }).PRACTICE_CLEANUP_ENABLED,
    ).toBe(true);
  });

  it('rejects a PRACTICE_CLEANUP_ENABLED value that is not a boolean word', () => {
    expect(envSchema.safeParse({ ...base, PRACTICE_CLEANUP_ENABLED: 'maybe' }).success).toBe(false);
    expect(envSchema.safeParse({ ...base, PRACTICE_CLEANUP_ENABLED: '' }).success).toBe(false);
  });

  it('requires a Gemini key only when the Gemini driver is chosen', () => {
    expect(envSchema.safeParse({ ...base, AI_DRIVER: 'gemini' }).success).toBe(false);
    expect(envSchema.safeParse({ ...base, AI_DRIVER: 'gemini', GEMINI_API_KEY: 'k' }).success).toBe(
      true,
    );
    expect(envSchema.safeParse({ ...base, AI_DRIVER: 'mock' }).success).toBe(true);
  });

  it('treats an empty SMTP_FROM as not set', () => {
    expect(envSchema.parse({ ...base, SMTP_FROM: '' }).SMTP_FROM).toBeUndefined();
  });
});
