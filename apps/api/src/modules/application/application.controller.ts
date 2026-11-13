import type { RequestHandler } from 'express';
import { applicationDtoSchema } from '@launchly/shared';
import { currentAuth } from '@/middlewares/authenticate';
import type { createApplicationService } from '@/modules/application/application.service';

type ApplicationService = ReturnType<typeof createApplicationService>;

export function createApplicationController(service: ApplicationService) {
  return {
    create: (async (req, res) => {
      const { userId } = currentAuth(res.locals);
      res.status(201).json(applicationDtoSchema.parse(await service.create(userId, req.body)));
    }) satisfies RequestHandler,
  };
}
