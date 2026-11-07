import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  MAIL_DRIVER: z.enum(['smtp', 'ses']).default('smtp'),
  TRUST_PROXY_HOPS: z.coerce.number().default(0),
  APP_URL: z.string().default('http://localhost:3000'),
  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().optional().default(587),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASSWORD: z.string().optional().default(''),
  SMTP_FROM: z.string().optional().default(''),
  SES_FROM: z.string().optional().default(''),
  GEMINI_API_KEY: z.string().optional().default(''),
});

export const env = envSchema.parse(process.env);
