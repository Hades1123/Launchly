import { assessmentDtoSchema, type CreateAssessmentInput } from '@launchly/shared';
import { request } from '@/lib/api/http';

/** Scores a CV against a job (or pasted description); the AI call can take up to 30 s. */
export function createAssessment(input: CreateAssessmentInput, signal?: AbortSignal) {
  return request('/assessments', assessmentDtoSchema, { method: 'POST', body: input, signal });
}
