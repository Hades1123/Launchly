import { Router } from 'express';
import {
  adminJobListQuerySchema,
  jobIdParamsSchema,
  moderationRejectSchema,
} from '@launchly/shared';
import { authenticate } from '@/middlewares/authenticate';
import { authorize } from '@/middlewares/authorize';
import { validate } from '@/middlewares/validate';
import type { createAuthService } from '@/modules/auth/auth.service';
import { createAdminJobController } from '@/modules/admin/admin-job.controller';
import type { createAdminJobService } from '@/modules/admin/admin-job.service';

type AuthService = ReturnType<typeof createAuthService>;
type AdminJobService = ReturnType<typeof createAdminJobService>;

export function createAdminJobRouter(authService: AuthService, service: AdminJobService) {
  const router = Router();
  const controller = createAdminJobController(service);
  const params = validate({ params: jobIdParamsSchema });

  router.use(authenticate(authService), authorize('ADMIN'));
  router.get('/', validate({ query: adminJobListQuerySchema }), controller.list);
  router.get('/:id', params, controller.get);
  router.post('/:id/approve', params, controller.approve);
  router.post(
    '/:id/reject',
    validate({ params: jobIdParamsSchema, body: moderationRejectSchema }),
    controller.reject,
  );

  return router;
}
