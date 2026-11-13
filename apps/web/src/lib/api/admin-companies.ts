import { adminCompanySchema, type CompanyModerationStatus } from '@launchly/shared';
import { request } from '@/lib/api/http';

/** Admin: companies of one moderation status, oldest first. */
export function listAdminCompanies(status: CompanyModerationStatus = 'PENDING') {
  return request('/admin/companies', adminCompanySchema.array(), {
    query: { status },
    cache: 'no-store',
  });
}

export function getAdminCompany(id: string) {
  return request(`/admin/companies/${id}`, adminCompanySchema, { cache: 'no-store' });
}

export function approveCompany(id: string) {
  return request(`/admin/companies/${id}/approve`, adminCompanySchema, { method: 'POST' });
}

export function rejectCompany(id: string, reason: string) {
  return request(`/admin/companies/${id}/reject`, adminCompanySchema, {
    method: 'POST',
    body: { reason },
  });
}
