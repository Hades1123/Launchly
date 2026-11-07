import type { Request, Response, NextFunction } from 'express';
import { currentAuth } from '@/middlewares/authenticate';
import type { createJobsService } from './jobs.service';
import type { ResubmitJobInput } from '@launchly/shared';

type JobsService = ReturnType<typeof createJobsService>;

export function createJobsController(service: JobsService) {
  return {
    async getRejectedJob(req: Request<{ id: string }>, res: Response, next: NextFunction) {
      try {
        const { userId } = currentAuth(res.locals);
        const job = await service.getRejectedJobForEdit(req.params.id, userId);
        res.json({ job });
      } catch (error) {
        next(error);
      }
    },

    async resubmit(
      req: Request<{ id: string }, unknown, ResubmitJobInput>,
      res: Response,
      next: NextFunction,
    ) {
      try {
        const { userId } = currentAuth(res.locals);
        const job = await service.resubmitRejectedJob(req.params.id, userId, req.body);
        res.json({
          message: 'Tin tuyển dụng đã được gửi lại để xét duyệt',
          job,
        });
      } catch (error) {
        next(error);
      }
    },
  };
}