import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import type { HealthResponse } from '@launchly/shared';
import { env } from '@/lib/env';
import { prisma } from '@/lib/prisma';
import { createAuthService } from '@/modules/auth/auth.service';
import { createAuthRouter } from '@/modules/auth/auth.routes';
import { createGoogleProvider } from '@/providers/google/google.provider';
import { createMailProvider } from '@/providers/mail/mail-provider';
import { errorHandler } from '@/middlewares/error-handler';

export function createApp(
  authService = createAuthService(
    prisma,
    createMailProvider(),
    createGoogleProvider(),
  ),
) {
  const app = express();
  if (env.TRUST_PROXY_HOPS > 0) {
    app.set('trust proxy', env.TRUST_PROXY_HOPS);
  }
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    const body: HealthResponse = { status: 'ok', time: new Date().toISOString() };
    res.json(body);
  });

  app.use('/auth', createAuthRouter(authService));
  app.use(errorHandler);
  return app;
}
