import { healthResponseSchema } from '@launchly/shared';
import { request, type RequestOptions } from '@/lib/api/http';

export function getHealth(options: RequestOptions = {}) {
  return request('/health', healthResponseSchema, { auth: false, ...options });
}
