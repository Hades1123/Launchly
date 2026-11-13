import { Router } from 'express';
import { jobIdParamsSchema, saveJobSchema } from '@launchly/shared';
import { authenticate } from '@/middlewares/authenticate';
import { authorize } from '@/middlewares/authorize';
import { validate } from '@/middlewares/validate';
import type { createAuthService } from '@/modules/auth/auth.service';
import { createRecruiterJobController } from '@/modules/job/recruiter-job.controller';
import type { createRecruiterJobService } from '@/modules/job/recruiter-job.service';

type AuthService = ReturnType<typeof createAuthService>;
type Service = ReturnType<typeof createRecruiterJobService>;

/** The signed-in recruiter's own jobs, mounted at `/recruiter/jobs`. */
export function createRecruiterJobRouter(authService: AuthService, service: Service) {
  const router = Router();
  const controller = createRecruiterJobController(service);
  const recruiterOnly = [authenticate(authService), authorize('RECRUITER')];

  router.get('/', ...recruiterOnly, controller.list);
  router.post('/', ...recruiterOnly, validate({ body: saveJobSchema }), controller.create);
  router.get('/:id', ...recruiterOnly, validate({ params: jobIdParamsSchema }), controller.get);
  router.put(
    '/:id',
    ...recruiterOnly,
    validate({ params: jobIdParamsSchema, body: saveJobSchema }),
    controller.update,
  );

  return router;
}
