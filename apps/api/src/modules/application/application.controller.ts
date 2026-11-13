import type { RequestHandler } from 'express';
import {
  applicationDtoSchema,
  candidateApplicationDetailSchema,
  candidateApplicationListSchema,
  recruiterApplicationListSchema,
  recruiterApplicationSchema,
  type ApplicationIdParams,
  type JobIdParams,
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

    listForJob: (async (req, res) => {
      const { userId } = currentAuth(res.locals);
      const { id } = req.params as unknown as JobIdParams;
      res.json(
        recruiterApplicationListSchema.parse({ data: await service.listForJob(userId, id) }),
      );
    }) satisfies RequestHandler,

    updateStatus: (async (req, res) => {
      const { userId } = currentAuth(res.locals);
      const { id } = req.params as unknown as ApplicationIdParams;
      res.json(recruiterApplicationSchema.parse(await service.updateStatus(userId, id, req.body)));
    }) satisfies RequestHandler,

    downloadResume: (async (req, res) => {
      const { userId } = currentAuth(res.locals);
      const { id } = req.params as unknown as ApplicationIdParams;
      const { stream, fileName, contentType } = await service.getResumeFile(
        userId,
        res.locals.currentUser.role,
        id,
      );
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
      // A storage failure after the headers went out can only end the response.
      stream.on('error', (error) => res.destroy(error));
      stream.pipe(res);
    }) satisfies RequestHandler,
  };
}
