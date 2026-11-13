import { roundsResponseSchema, type ReplaceRoundsInput } from '@launchly/shared';
import { request } from '@/lib/api/http';

/** Recruiter: the ordered hiring rounds of a job they own. */
export function getJobRounds(jobId: string) {
  return request(`/jobs/${jobId}/rounds`, roundsResponseSchema, { cache: 'no-store' });
}

/** Recruiter: replaces the whole list; array order becomes position 1..n. */
export function replaceJobRounds(jobId: string, input: ReplaceRoundsInput) {
  return request(`/jobs/${jobId}/rounds`, roundsResponseSchema, { method: 'PUT', body: input });
}
