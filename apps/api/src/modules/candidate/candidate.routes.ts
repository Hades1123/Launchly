import { Router } from 'express';
import { CandidateController } from './candidate.controller';
import { authenticate, requireCandidateAuth } from '@/middlewares/auth';
import { uploadCvMiddleware } from '@/middlewares/upload';

export function createCandidateRouter(
  controller: CandidateController = new CandidateController(),
): Router {
  const router = Router();

  // All candidate routes require authentication and CANDIDATE role
  router.use(authenticate, requireCandidateAuth);

  router.get('/profile', controller.getProfile);
  router.put('/profile', controller.updateProfile);

  router.post('/cv', uploadCvMiddleware, controller.uploadCv);
  router.delete('/cv', controller.deleteCv);
  router.get('/cv', controller.downloadCv);

  return router;
}

export const candidateRouter = createCandidateRouter();
