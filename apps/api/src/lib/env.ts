import { z } from 'zod';

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().default(4000),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),
    DATABASE_URL: z.string().min(1),
    CORS_ORIGIN: z.string().default('http://localhost:3000'),
    JWT_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
    MAIL_DRIVER: z.enum(['smtp', 'ses']).default('smtp'),
    APP_URL: z.url().default('http://localhost:3000'),
    GOOGLE_CLIENT_ID: z.string().optional(),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    SMTP_FROM: z.preprocess((value) => (value === '' ? undefined : value), z.email().optional()),
    SES_FROM: z.preprocess((value) => (value === '' ? undefined : value), z.email().optional()),
    GEMINI_API_KEY: z.string().optional(),
    AI_DRIVER: z.enum(['mock', 'gemini']).default('mock'),
    AI_MODEL: z.string().min(1).default('gemini-3.5-flash-lite'),
    // Sign-ins allowed per IP in 2 minutes; Playwright raises it because specs sign in often.
    // Deletes expired incomplete interview practice sessions at startup and hourly (SCRUM-66).
    PRACTICE_CLEANUP_ENABLED: z.stringbool().default(true),
    LOGIN_RATE_LIMIT: z.coerce.number().int().positive().default(10),
  })
  .refine((e) => e.AI_DRIVER !== 'gemini' || Boolean(e.GEMINI_API_KEY), {
    path: ['GEMINI_API_KEY'],
    message: 'GEMINI_API_KEY is required when AI_DRIVER=gemini',
  });

export const env = envSchema.parse(process.env);
