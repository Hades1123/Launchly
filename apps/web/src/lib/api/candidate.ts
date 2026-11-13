import {
  candidateProfileSchema,
  cvMetadataSchema,
  type UpdateCandidateProfileInput,
} from '@launchly/shared';
import { request, requestBlob, requestVoid } from '@/lib/api/http';

export function getCandidateProfile() {
  return request('/candidates/profile', candidateProfileSchema);
}

export function updateCandidateProfile(input: UpdateCandidateProfileInput) {
  return request('/candidates/profile', candidateProfileSchema, { method: 'PUT', body: input });
}

export function uploadCv(file: File) {
  const form = new FormData();
  form.append('cv', file);
  return request('/candidates/cv', cvMetadataSchema, { method: 'POST', body: form });
}

export function deleteCv() {
  return requestVoid('/candidates/cv', { method: 'DELETE' });
}

export function downloadCv() {
  return requestBlob('/candidates/cv');
}

/** Records the candidate's agreement to AI processing of their CV; safe to repeat. */
export function acceptAiConsent() {
  return request('/candidates/me/ai-consent', candidateProfileSchema, { method: 'POST' });
}
