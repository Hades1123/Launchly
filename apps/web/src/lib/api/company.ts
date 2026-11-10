import { companyDtoSchema, type CreateCompanyInput } from '@launchly/shared';
import { request } from '@/lib/api/http';

export function createCompany(input: CreateCompanyInput) {
  return request('/companies', companyDtoSchema, { method: 'POST', body: input });
}

/** Public: only approved companies are returned. */
export function getCompany(id: string) {
  return request(`/companies/${id}`, companyDtoSchema, { auth: false });
}
