import {
  recruiterApplicationListSchema,
  recruiterApplicationSchema,
  type UpdateApplicationStatusInput,
} from '@launchly/shared';
import { request, requestBlob } from '@/lib/api/http';

/** Recruiter: every applicant of a job they manage, newest first. */
export function listJobApplicants(jobId: string, signal?: AbortSignal) {
  return request(`/jobs/${jobId}/applications`, recruiterApplicationListSchema, {
    cache: 'no-store',
    signal,
  });
}

/** Recruiter: moves an applicant to a new status, optionally into a round, with a note. */
export function updateApplicationStatus(
  applicationId: string,
  input: UpdateApplicationStatusInput,
) {
  return request(`/applications/${applicationId}/status`, recruiterApplicationSchema, {
    method: 'PATCH',
    body: input,
  });
}

/** Recruiter: the applicant's CV file (the endpoint needs the access token, so no plain link). */
export function downloadApplicationResume(applicationId: string) {
  return requestBlob(`/applications/${applicationId}/resume`);
}
