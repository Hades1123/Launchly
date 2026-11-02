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
});

export const env = envSchema.parse(process.env);
