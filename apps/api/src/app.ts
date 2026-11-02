import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import type { HealthResponse } from '@launchly/shared';
import { env } from '@/lib/env';
import { errorHandler } from '@/middlewares/error-handler';

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    const body: HealthResponse = { status: 'ok', time: new Date().toISOString() };
    res.json(body);
  });

  app.use(errorHandler);
  return app;
}
