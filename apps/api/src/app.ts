import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from '@/lib/env';
import { prisma } from '@/lib/prisma';
import { createAdminCompanyRouter } from '@/modules/admin/admin-company.routes';
import { createAdminCompanyService } from '@/modules/admin/admin-company.service';
import { createAdminJobRouter } from '@/modules/admin/admin-job.routes';
import { createAdminJobService } from '@/modules/admin/admin-job.service';
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
import { createRecruiterJobRouter } from '@/modules/job/recruiter-job.routes';
import { createRecruiterJobService } from '@/modules/job/recruiter-job.service';
import { createApplicationRouter } from '@/modules/application/application.routes';
import { createApplicationService } from '@/modules/application/application.service';
import { createJobApplicationsRouter } from '@/modules/application/job-applications.routes';
import { createAssessmentRouter } from '@/modules/assessment/assessment.routes';
import { createAssessmentService } from '@/modules/assessment/assessment.service';
import { createInterviewPracticeRouter } from '@/modules/interview-practice/interview-practice.routes';
import { createInterviewPracticeService } from '@/modules/interview-practice/interview-practice.service';
import { notFound } from '@/middlewares/not-found';
import { errorHandler } from '@/middlewares/error-handler';

export function createApp(
  authService?: ReturnType<typeof createAuthService>,
  mail = createMailProvider(),
) {
  authService ??= createAuthService(prisma, mail, createGoogleProvider());
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
  app.use(
    '/recruiter/jobs',
    createRecruiterJobRouter(authService, createRecruiterJobService(prisma)),
  );
  const applicationService = createApplicationService(prisma);
  app.use('/jobs', createJobApplicationsRouter(authService, applicationService));
  app.use('/applications', createApplicationRouter(authService, applicationService));
  app.use('/assessments', createAssessmentRouter(authService, createAssessmentService(prisma)));
  app.use('/auth', createAuthRouter(authService));
  app.use(
    '/candidates/me/interview-practice',
    createInterviewPracticeRouter(authService, createInterviewPracticeService(prisma)),
  );
  app.use('/candidates', createCandidateRouter(authService));
  app.use('/companies', createCompanyRouter(authService, createCompanyService(prisma)));
  app.use(
    '/admin/companies',
    createAdminCompanyRouter(authService, createAdminCompanyService(prisma, mail)),
  );
  app.use('/admin/jobs', createAdminJobRouter(authService, createAdminJobService(prisma, mail)));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
