import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from '@/lib/env';
import { healthRouter } from '@/modules/health/health.routes';
import { notFound } from '@/middlewares/not-found';
import { errorHandler } from '@/middlewares/error-handler';

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.use('/health', healthRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
