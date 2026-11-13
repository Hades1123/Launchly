import type { RequestHandler } from 'express';
import { recruiterJobListResponseSchema, recruiterJobSchema } from '@launchly/shared';
import { currentAuth } from '@/middlewares/authenticate';
import type { createRecruiterJobService } from '@/modules/job/recruiter-job.service';

type Service = ReturnType<typeof createRecruiterJobService>;

export function createRecruiterJobController(service: Service) {
  return {
    list: (async (_req, res) => {
      const { userId } = currentAuth(res.locals);
      res.json(recruiterJobListResponseSchema.parse({ jobs: await service.list(userId) }));
    }) satisfies RequestHandler,

    get: (async (req, res) => {
      const { userId } = currentAuth(res.locals);
      res.json(recruiterJobSchema.parse(await service.get(req.params.id as string, userId)));
    }) satisfies RequestHandler,

    create: (async (req, res) => {
      const { userId } = currentAuth(res.locals);
      res.status(201).json(recruiterJobSchema.parse(await service.create(userId, req.body)));
    }) satisfies RequestHandler,

    update: (async (req, res) => {
      const { userId } = currentAuth(res.locals);
      const job = await service.update(req.params.id as string, userId, req.body);
      res.json(recruiterJobSchema.parse(job));
    }) satisfies RequestHandler,
  };
}
