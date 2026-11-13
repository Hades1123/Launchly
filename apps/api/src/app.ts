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
import { createCandidateRouter } from '@/modules/candidate/candidate.routes';
import { jobRouter } from '@/modules/job/job.routes';
import { createJobRoundsRouter } from '@/modules/job/job-rounds.routes';
import { createJobRoundsService } from '@/modules/job/job-rounds.service';
import { createApplicationRouter } from '@/modules/application/application.routes';
import { createApplicationService } from '@/modules/application/application.service';
import { createJobApplicationsRouter } from '@/modules/application/job-applications.routes';
import { createAssessmentRouter } from '@/modules/assessment/assessment.routes';
import { createAssessmentService } from '@/modules/assessment/assessment.service';
import { notFound } from '@/middlewares/not-found';
import { errorHandler } from '@/middlewares/error-handler';

export function createApp(
  authService = createAuthService(prisma, createMailProvider(), createGoogleProvider()),
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
  app.use('/jobs', jobRouter);
  app.use('/jobs', createJobRoundsRouter(authService, createJobRoundsService(prisma)));
  const applicationService = createApplicationService(prisma);
  app.use('/jobs', createJobApplicationsRouter(authService, applicationService));
  app.use('/applications', createApplicationRouter(authService, applicationService));
  app.use('/assessments', createAssessmentRouter(authService, createAssessmentService(prisma)));
  app.use('/auth', createAuthRouter(authService));
  app.use('/candidates', createCandidateRouter(authService));
  app.use('/companies', createCompanyRouter(authService, createCompanyService(prisma)));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
