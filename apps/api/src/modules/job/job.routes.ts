import { Router } from 'express';
import { JobController } from './job.controller';
import { validate } from '@/middlewares/validate';
import { jobFilterQuerySchema, jobIdParamsSchema } from '@launchly/shared';

export function createJobRouter(controller: JobController = new JobController()): Router {
  const router = Router();

  // Public endpoint with query parameters validation
  router.get('/', validate({ query: jobFilterQuerySchema }), controller.searchJobs);
  router.get('/:id', validate({ params: jobIdParamsSchema }), controller.getJob);

  return router;
}

export const jobRouter = createJobRouter();
