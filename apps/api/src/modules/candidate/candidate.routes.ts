import { Router } from 'express';
import { updateCandidateProfileSchema } from '@launchly/shared';
import { authenticate } from '@/middlewares/authenticate';
import { authorize } from '@/middlewares/authorize';
import { uploadCvMiddleware } from '@/middlewares/upload';
import { validate } from '@/middlewares/validate';
import type { createAuthService } from '@/modules/auth/auth.service';
import { CandidateController } from '@/modules/candidate/candidate.controller';

type AuthService = ReturnType<typeof createAuthService>;

export function createCandidateRouter(
  authService: AuthService,
  controller: CandidateController = new CandidateController(),
): Router {
  const router = Router();

  router.use(authenticate(authService), authorize('CANDIDATE'));

  router.get('/profile', controller.getProfile);
  router.put(
    '/profile',
    validate({ body: updateCandidateProfileSchema }),
    controller.updateProfile,
  );

  router.post('/cv', uploadCvMiddleware, controller.uploadCv);
  router.delete('/cv', controller.deleteCv);
  router.get('/cv', controller.downloadCv);

  return router;
}
