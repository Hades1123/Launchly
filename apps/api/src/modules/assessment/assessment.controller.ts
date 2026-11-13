import type { RequestHandler } from 'express';
import { assessmentDtoSchema } from '@launchly/shared';
import { currentAuth } from '@/middlewares/authenticate';
import type { createAssessmentService } from '@/modules/assessment/assessment.service';

type AssessmentService = ReturnType<typeof createAssessmentService>;

export function createAssessmentController(service: AssessmentService) {
  return {
    create: (async (req, res) => {
      const { userId } = currentAuth(res.locals);
      res.status(201).json(assessmentDtoSchema.parse(await service.create(userId, req.body)));
    }) satisfies RequestHandler,
  };
}
