import { adminJobSchema, type AdminJobListQuery } from '@launchly/shared';
import { request } from '@/lib/api/http';

/** Admin: jobs of one status, oldest submission first. */
export function listAdminJobs(status: AdminJobListQuery['status'] = 'PENDING') {
  return request('/admin/jobs', adminJobSchema.array(), { query: { status }, cache: 'no-store' });
}

export function getAdminJob(id: string) {
  return request(`/admin/jobs/${id}`, adminJobSchema, { cache: 'no-store' });
}

export function approveJob(id: string) {
  return request(`/admin/jobs/${id}/approve`, adminJobSchema, { method: 'POST' });
}

export function rejectJob(id: string, reason: string) {
  return request(`/admin/jobs/${id}/reject`, adminJobSchema, { method: 'POST', body: { reason } });
}
