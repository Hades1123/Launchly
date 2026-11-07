import { Router } from 'express';
import { jobIdParamsSchema, resubmitJobSchema } from '@launchly/shared';
import { authenticate } from '@/middlewares/authenticate';
import { authorize } from '@/middlewares/authorize';
import { validate } from '@/middlewares/validate';
import type { createAuthService } from '@/modules/auth/auth.service';
import { createJobsController } from './jobs.controller';
import type { createJobsService } from './jobs.service';

type AuthService = ReturnType<typeof createAuthService>;
type JobsService = ReturnType<typeof createJobsService>;

export function createJobsRouter(authService: AuthService, service: JobsService) {
  const router = Router();
  const controller = createJobsController(service);
  const recruiterOnly = [authenticate(authService), authorize('RECRUITER')];

  // Lấy chi tiết job bị từ chối để đổ vào form sửa
  router.get(
    '/:id/rejected',
    ...recruiterOnly,
    validate({ params: jobIdParamsSchema }),
    controller.getRejectedJob
  );

  // Sửa và nộp lại job bị từ chối
  router.put(
    '/:id/resubmit',
    ...recruiterOnly,
    validate({ params: jobIdParamsSchema, body: resubmitJobSchema }),
    controller.resubmit
  );

  return router;
}