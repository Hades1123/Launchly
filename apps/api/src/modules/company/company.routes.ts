import { Router } from 'express';
import { companyIdParamsSchema, createCompanySchema } from '@launchly/shared';
import { authenticate } from '@/middlewares/authenticate';
import { authorize } from '@/middlewares/authorize';
import { validate } from '@/middlewares/validate';
import type { createAuthService } from '@/modules/auth/auth.service';
import { createCompanyController } from '@/modules/company/company.controller';
import type { createCompanyService } from '@/modules/company/company.service';

type AuthService = ReturnType<typeof createAuthService>;
type CompanyService = ReturnType<typeof createCompanyService>;

export function createCompanyRouter(authService: AuthService, service: CompanyService) {
  const router = Router();
  const controller = createCompanyController(service);
  const recruiterOnly = [authenticate(authService), authorize('RECRUITER')];

  router.post('/', ...recruiterOnly, validate({ body: createCompanySchema }), controller.create);
  router.get('/me', ...recruiterOnly, controller.getMine);
  router.get('/:id', validate({ params: companyIdParamsSchema }), controller.getPublic);

  return router;
}
