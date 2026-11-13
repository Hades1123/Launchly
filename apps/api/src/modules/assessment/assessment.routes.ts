import { Router } from 'express';
import { createAssessmentSchema } from '@launchly/shared';
import { authenticate } from '@/middlewares/authenticate';
import { authorize } from '@/middlewares/authorize';
import { validate } from '@/middlewares/validate';
import type { createAuthService } from '@/modules/auth/auth.service';
import { createAssessmentController } from '@/modules/assessment/assessment.controller';
import type { createAssessmentService } from '@/modules/assessment/assessment.service';

type AuthService = ReturnType<typeof createAuthService>;
type AssessmentService = ReturnType<typeof createAssessmentService>;

export function createAssessmentRouter(authService: AuthService, service: AssessmentService) {
  const router = Router();
  const controller = createAssessmentController(service);

  router.post(
    '/',
    authenticate(authService),
    authorize('CANDIDATE'),
    validate({ body: createAssessmentSchema }),
    controller.create,
  );
  return router;
}
