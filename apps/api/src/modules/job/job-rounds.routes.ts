import { Router } from 'express';
import { jobIdParamsSchema, replaceRoundsSchema } from '@launchly/shared';
import { authenticate } from '@/middlewares/authenticate';
import { authorize } from '@/middlewares/authorize';
import { validate } from '@/middlewares/validate';
import type { createAuthService } from '@/modules/auth/auth.service';
import { createJobRoundsController } from '@/modules/job/job-rounds.controller';
import type { createJobRoundsService } from '@/modules/job/job-rounds.service';

type AuthService = ReturnType<typeof createAuthService>;
type Service = ReturnType<typeof createJobRoundsService>;

export function createJobRoundsRouter(authService: AuthService, service: Service) {
  const router = Router();
  const controller = createJobRoundsController(service);
  const recruiterOnly = [authenticate(authService), authorize('RECRUITER')];

  router.get(
    '/:id/rounds',
    ...recruiterOnly,
    validate({ params: jobIdParamsSchema }),
    controller.list,
  );
  router.put(
    '/:id/rounds',
    ...recruiterOnly,
    validate({ params: jobIdParamsSchema, body: replaceRoundsSchema }),
    controller.replace,
  );

  return router;
}
