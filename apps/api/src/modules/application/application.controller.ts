import type { RequestHandler } from 'express';
import {
  applicationDtoSchema,
  candidateApplicationDetailSchema,
  candidateApplicationListSchema,
  type ApplicationIdParams,
} from '@launchly/shared';
import { currentAuth } from '@/middlewares/authenticate';
import type { createApplicationService } from '@/modules/application/application.service';

type ApplicationService = ReturnType<typeof createApplicationService>;

export function createApplicationController(service: ApplicationService) {
  return {
    create: (async (req, res) => {
      const { userId } = currentAuth(res.locals);
      res.status(201).json(applicationDtoSchema.parse(await service.create(userId, req.body)));
    }) satisfies RequestHandler,

    listMine: (async (_req, res) => {
      const { userId } = currentAuth(res.locals);
      res.json(candidateApplicationListSchema.parse({ data: await service.listMine(userId) }));
    }) satisfies RequestHandler,

    getMine: (async (req, res) => {
      const { userId } = currentAuth(res.locals);
      const { id } = req.params as unknown as ApplicationIdParams;
      res.json(candidateApplicationDetailSchema.parse(await service.getMine(userId, id)));
    }) satisfies RequestHandler,
  };
}
