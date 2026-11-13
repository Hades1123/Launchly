import {
  applicationDtoSchema,
  candidateApplicationListSchema,
  type CreateApplicationInput,
} from '@launchly/shared';
import { request } from '@/lib/api/http';

/** A candidate applies to a public job with one of their own CVs. */
export function createApplication(input: CreateApplicationInput) {
  return request('/applications', applicationDtoSchema, { method: 'POST', body: input });
}

/** The signed-in candidate's applications, newest first. */
export function listMyApplications() {
  return request('/applications/me', candidateApplicationListSchema);
}
