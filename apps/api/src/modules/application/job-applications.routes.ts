import { Router } from 'express';
import { jobIdParamsSchema } from '@launchly/shared';
import { authenticate } from '@/middlewares/authenticate';
import { authorize } from '@/middlewares/authorize';
import { validate } from '@/middlewares/validate';
import type { createAuthService } from '@/modules/auth/auth.service';
import { createApplicationController } from '@/modules/application/application.controller';
import type { createApplicationService } from '@/modules/application/application.service';

type AuthService = ReturnType<typeof createAuthService>;
type ApplicationService = ReturnType<typeof createApplicationService>;

/** `GET /jobs/:id/applications`: the applicants of one job, mounted under `/jobs`. */
export function createJobApplicationsRouter(authService: AuthService, service: ApplicationService) {
  const router = Router();
  const controller = createApplicationController(service);

  router.get(
    '/:id/applications',
    authenticate(authService),
    authorize('RECRUITER'),
    validate({ params: jobIdParamsSchema }),
    controller.listForJob,
  );
  return router;
}
