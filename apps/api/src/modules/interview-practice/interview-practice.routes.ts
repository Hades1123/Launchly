import { Router } from 'express';
import {
  practiceAnswerInputSchema,
  practiceHistoryQuerySchema,
  practiceQuestionParamsSchema,
  practiceRoundParamsSchema,
  practiceSessionIdParamsSchema,
  startPracticeSchema,
} from '@launchly/shared';
import { authenticate } from '@/middlewares/authenticate';
import { authorize } from '@/middlewares/authorize';
import { createInterviewAiRateLimit } from '@/middlewares/interview-ai-rate-limit';
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
  // One limiter instance, so every AI route shares the same per-candidate counter.
  const aiRateLimit = createInterviewAiRateLimit();

  router.post('/', validate({ body: startPracticeSchema }), controller.start);
  router.get('/', validate({ query: practiceHistoryQuerySchema }), controller.history);
  router.get('/:id', validate({ params: practiceSessionIdParamsSchema }), controller.resume);
  router.post(
    '/:id/rounds/:roundId/questions',
    aiRateLimit,
    validate({ params: practiceRoundParamsSchema }),
    controller.generateQuestions,
  );
  router.put(
    '/:id/questions/:questionId/answer',
    validate({ params: practiceQuestionParamsSchema, body: practiceAnswerInputSchema }),
    controller.saveAnswer,
  );

  return router;
}
