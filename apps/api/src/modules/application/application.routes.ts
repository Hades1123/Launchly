import { Router } from 'express';
import { createApplicationSchema } from '@launchly/shared';
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

  return router;
}
