import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from '@/lib/env';
import { prisma } from '@/lib/prisma';
import { createAuthService } from '@/modules/auth/auth.service';
import { createAuthRouter } from '@/modules/auth/auth.routes';
import { createGoogleProvider } from '@/providers/google/google.provider';
import { createMailProvider } from '@/providers/mail/mail-provider';
import { createCompanyRouter } from '@/modules/company/company.routes';
import { createCompanyService } from '@/modules/company/company.service';
import { healthRouter } from '@/modules/health/health.routes';
import { notFound } from '@/middlewares/not-found';
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

  app.use('/health', healthRouter);

  app.use('/auth', createAuthRouter(authService));
  app.use('/companies', createCompanyRouter(authService, createCompanyService(prisma)));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
