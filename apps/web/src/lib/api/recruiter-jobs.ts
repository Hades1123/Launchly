import {
  recruiterJobListResponseSchema,
  recruiterJobSchema,
  type SaveJobInput,
} from '@launchly/shared';
import { request } from '@/lib/api/http';

/** Recruiter: own jobs in every status, most recently changed first. */
export function listMyJobs() {
  return request('/recruiter/jobs', recruiterJobListResponseSchema, { cache: 'no-store' });
}

/** Recruiter: one own job with its real salary, rounds and notes. */
export function getMyJob(jobId: string) {
  return request(`/recruiter/jobs/${jobId}`, recruiterJobSchema, { cache: 'no-store' });
}

/** Recruiter: saves a new draft (`DRAFT`) or sends it to admin approval (`SUBMIT`). */
export function createJob(input: SaveJobInput) {
  return request('/recruiter/jobs', recruiterJobSchema, { method: 'POST', body: input });
}

/** Recruiter: saves a draft again or submits it; only drafts can be changed. */
export function updateJob(jobId: string, input: SaveJobInput) {
  return request(`/recruiter/jobs/${jobId}`, recruiterJobSchema, { method: 'PUT', body: input });
}
