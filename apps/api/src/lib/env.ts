import { z } from 'zod';

const envSchema = z.object({
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
  SMTP_FROM: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.email().optional(),
  ),
  SES_FROM: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.email().optional(),
  ),
  GEMINI_API_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
