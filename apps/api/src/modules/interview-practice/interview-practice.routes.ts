import { Router } from 'express';
import {
  practiceHistoryQuerySchema,
  practiceSessionIdParamsSchema,
  startPracticeSchema,
} from '@launchly/shared';
import { authenticate } from '@/middlewares/authenticate';
import { authorize } from '@/middlewares/authorize';
import { validate } from '@/middlewares/validate';
import type { createAuthService } from '@/modules/auth/auth.service';
import { createInterviewPracticeController } from '@/modules/interview-practice/interview-practice.controller';
import type { createInterviewPracticeService } from '@/modules/interview-practice/interview-practice.service';

type AuthService = ReturnType<typeof createAuthService>;
type Service = ReturnType<typeof createInterviewPracticeService>;

/** Candidate-only interview practice, mounted at `/candidates/me/interview-practice`. */
export function createInterviewPracticeRouter(authService: AuthService, service: Service) {
  const router = Router();
  const controller = createInterviewPracticeController(service);

  router.use(authenticate(authService), authorize('CANDIDATE'));

  router.post('/', validate({ body: startPracticeSchema }), controller.start);
  router.get('/', validate({ query: practiceHistoryQuerySchema }), controller.history);
  router.get('/:id', validate({ params: practiceSessionIdParamsSchema }), controller.resume);

  return router;
}
