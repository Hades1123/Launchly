import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from '@/lib/env';
import { healthRouter } from '@/modules/health/health.routes';
import { candidateRouter } from '@/modules/candidate/candidate.routes';
import { notFound } from '@/middlewares/not-found';
import { errorHandler } from '@/middlewares/error-handler';

export function createApp() {
  const app = express();
  if (env.TRUST_PROXY_HOPS > 0) {
    app.set('trust proxy', env.TRUST_PROXY_HOPS);
  }
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.use('/health', healthRouter);
  app.use('/api/candidates', candidateRouter);
  app.use('/candidates', candidateRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
