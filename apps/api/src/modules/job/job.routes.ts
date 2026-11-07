import { Router } from 'express';
import { JobController } from './job.controller';
import { validate } from '@/middlewares/validate';
import { jobFilterQuerySchema } from '@launchly/shared';

export function createJobRouter(controller: JobController = new JobController()): Router {
  const router = Router();

  // Public endpoint with query parameters validation
  router.get('/', validate({ query: jobFilterQuerySchema }), controller.searchJobs);

  return router;
}

export const jobRouter = createJobRouter();
