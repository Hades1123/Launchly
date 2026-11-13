import { Router } from 'express';
import {
  applicationIdParamsSchema,
  createApplicationSchema,
  updateApplicationStatusSchema,
} from '@launchly/shared';
import { authenticate } from '@/middlewares/authenticate';
import { authorize } from '@/middlewares/authorize';
import { validate } from '@/middlewares/validate';
import type { createAuthService } from '@/modules/auth/auth.service';
import { createApplicationController } from '@/modules/application/application.controller';
import type { createApplicationService } from '@/modules/application/application.service';

type AuthService = ReturnType<typeof createAuthService>;
type ApplicationService = ReturnType<typeof createApplicationService>;

export function createApplicationRouter(authService: AuthService, service: ApplicationService) {
  const router = Router();
  const controller = createApplicationController(service);

  router.post(
    '/',
    authenticate(authService),
    authorize('CANDIDATE'),
    validate({ body: createApplicationSchema }),
    controller.create,
  );

  // `/me` is registered before `/:id` so it is never read as an id.
  router.get('/me', authenticate(authService), authorize('CANDIDATE'), controller.listMine);
  router.get(
    '/:id',
    authenticate(authService),
    authorize('CANDIDATE'),
    validate({ params: applicationIdParamsSchema }),
    controller.getMine,
  );
  router.patch(
    '/:id/status',
    authenticate(authService),
    authorize('RECRUITER'),
    validate({ params: applicationIdParamsSchema, body: updateApplicationStatusSchema }),
    controller.updateStatus,
  );
  router.get(
    '/:id/resume',
    authenticate(authService),
    authorize('CANDIDATE', 'RECRUITER'),
    validate({ params: applicationIdParamsSchema }),
    controller.downloadResume,
  );
  return router;
}
