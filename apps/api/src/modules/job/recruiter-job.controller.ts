import type { RequestHandler } from 'express';
import {
  recruiterJobListResponseSchema,
  type BulkDeleteJobsInput,
  recruiterJobSchema,
  type RecruiterJobListQuery,
} from '@launchly/shared';
import { currentAuth } from '@/middlewares/authenticate';
import type { createRecruiterJobService } from '@/modules/job/recruiter-job.service';

type Service = ReturnType<typeof createRecruiterJobService>;

export function createRecruiterJobController(service: Service) {
  return {
    list: (async (req, res) => {
      const { userId } = currentAuth(res.locals);
      const query = req.query as unknown as RecruiterJobListQuery;
      res.json(recruiterJobListResponseSchema.parse(await service.list(userId, query)));
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

    remove: (async (req, res) => {
      const { userId } = currentAuth(res.locals);
      await service.removeMany([req.params.id as string], userId);
      res.status(204).end();
    }) satisfies RequestHandler,

    removeMany: (async (req, res) => {
      const { userId } = currentAuth(res.locals);
      const { ids } = req.body as BulkDeleteJobsInput;
      await service.removeMany(ids, userId);
      res.status(204).end();
    }) satisfies RequestHandler,
  };
}
