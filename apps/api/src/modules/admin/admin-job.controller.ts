import type { RequestHandler } from 'express';
import {
  adminJobSchema,
  type AdminJobListQuery,
  type ModerationRejectInput,
} from '@launchly/shared';
import { currentAuth } from '@/middlewares/authenticate';
import type { createAdminJobService } from '@/modules/admin/admin-job.service';

type AdminJobService = ReturnType<typeof createAdminJobService>;

export function createAdminJobController(service: AdminJobService) {
  return {
    list: (async (req, res) => {
      const { status } = req.query as unknown as AdminJobListQuery;
      res.json(adminJobSchema.array().parse(await service.list(status)));
    }) satisfies RequestHandler,

    get: (async (req, res) => {
      res.json(adminJobSchema.parse(await service.get(req.params.id as string)));
    }) satisfies RequestHandler,

    approve: (async (req, res) => {
      const { userId } = currentAuth(res.locals);
      res.json(adminJobSchema.parse(await service.approve(req.params.id as string, userId)));
    }) satisfies RequestHandler,

    reject: (async (req, res) => {
      const { userId } = currentAuth(res.locals);
      const { reason } = req.body as ModerationRejectInput; // parsed by validate()
      const job = await service.reject(req.params.id as string, userId, reason);
      res.json(adminJobSchema.parse(job));
    }) satisfies RequestHandler,
  };
}
