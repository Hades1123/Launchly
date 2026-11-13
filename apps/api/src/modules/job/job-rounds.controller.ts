import type { RequestHandler } from 'express';
import { roundsResponseSchema } from '@launchly/shared';
import { currentAuth } from '@/middlewares/authenticate';
import type { createJobRoundsService } from '@/modules/job/job-rounds.service';

type Service = ReturnType<typeof createJobRoundsService>;

export function createJobRoundsController(service: Service) {
  return {
    list: (async (req, res) => {
      const { userId } = currentAuth(res.locals);
      const rounds = await service.list(req.params.id as string, userId);
      res.json(roundsResponseSchema.parse({ rounds }));
    }) satisfies RequestHandler,

    replace: (async (req, res) => {
      const { userId } = currentAuth(res.locals);
      const rounds = await service.replace(req.params.id as string, userId, req.body);
      res.json(roundsResponseSchema.parse({ rounds }));
    }) satisfies RequestHandler,
  };
}
