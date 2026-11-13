import { Router } from 'express';
import {
  adminCompanyListQuerySchema,
  companyIdParamsSchema,
  moderationRejectSchema,
} from '@launchly/shared';
import { authenticate } from '@/middlewares/authenticate';
import { authorize } from '@/middlewares/authorize';
import { validate } from '@/middlewares/validate';
import type { createAuthService } from '@/modules/auth/auth.service';
import { createAdminCompanyController } from '@/modules/admin/admin-company.controller';
import type { createAdminCompanyService } from '@/modules/admin/admin-company.service';

type AuthService = ReturnType<typeof createAuthService>;
type AdminCompanyService = ReturnType<typeof createAdminCompanyService>;

export function createAdminCompanyRouter(authService: AuthService, service: AdminCompanyService) {
  const router = Router();
  const controller = createAdminCompanyController(service);
  const params = validate({ params: companyIdParamsSchema });

  router.use(authenticate(authService), authorize('ADMIN'));
  router.get('/', validate({ query: adminCompanyListQuerySchema }), controller.list);
  router.get('/:id', params, controller.get);
  router.post('/:id/approve', params, controller.approve);
  router.post(
    '/:id/reject',
    validate({ params: companyIdParamsSchema, body: moderationRejectSchema }),
    controller.reject,
  );

  return router;
}
