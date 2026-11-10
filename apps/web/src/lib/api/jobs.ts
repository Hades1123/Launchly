import { publicJobListResponseSchema, type JobFilterQuery } from '@launchly/shared';
import { request, type RequestOptions } from '@/lib/api/http';

export type JobSearchFilters = Partial<JobFilterQuery>;

/** Public job search; also callable from server components. */
export function searchJobs(filters: JobSearchFilters, options: RequestOptions = {}) {
  return request('/jobs', publicJobListResponseSchema, {
    auth: false,
    ...options,
    query: { ...filters },
  });
}
