import type { RequestHandler } from 'express';
import { JobService } from './job.service';
import type { JobFilterQuery, JobIdParams } from '@launchly/shared';

export class JobController {
  constructor(private readonly jobService: JobService = new JobService()) {}

  searchJobs: RequestHandler = async (req, res, next) => {
    try {
      const query = (req.query ?? {}) as unknown as JobFilterQuery;
      const result = await this.jobService.searchJobs(query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  getJob: RequestHandler = async (req, res, next) => {
    try {
      const { id } = req.params as unknown as JobIdParams;
      res.json(await this.jobService.getPublicJobById(id));
    } catch (err) {
      next(err);
    }
  };
}
