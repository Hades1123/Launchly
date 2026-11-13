import {
  recruiterJobListResponseSchema,
  recruiterJobSchema,
  type RecruiterJobListQuery,
  type SaveJobInput,
} from '@launchly/shared';
import { request, requestVoid } from '@/lib/api/http';

/** Recruiter: one page of own jobs, most recently changed first, with counts per status. */
export function listMyJobs(query: Partial<RecruiterJobListQuery> = {}, signal?: AbortSignal) {
  return request('/recruiter/jobs', recruiterJobListResponseSchema, {
    cache: 'no-store',
    query,
    signal,
  });
}

/** Recruiter: deletes several own drafts, all or none. */
export function deleteJobs(ids: string[]) {
  return requestVoid('/recruiter/jobs/bulk-delete', { method: 'POST', body: { ids } });
}

/** Recruiter: deletes an own draft; submitted jobs cannot be deleted. */
export function deleteJob(jobId: string) {
  return requestVoid(`/recruiter/jobs/${jobId}`, { method: 'DELETE' });
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
