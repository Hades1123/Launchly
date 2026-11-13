import { describe, expect, it } from 'vitest';
import { candidateProfileSchema } from './candidate-profile';

const profile = {
  id: '33333333-3333-4333-8333-333333333333',
  userId: '11111111-1111-4111-8111-111111111111',
  fullName: 'Test Candidate',
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
};

describe('candidateProfileSchema AI consent', () => {
  it('accepts aiConsentAcceptedAt as an ISO string or null', () => {
    const granted = candidateProfileSchema.parse({
      ...profile,
      aiConsentAcceptedAt: '2026-11-13T03:00:00.000Z',
    });
    const missing = candidateProfileSchema.parse({ ...profile, aiConsentAcceptedAt: null });

    expect(granted.aiConsentAcceptedAt).toBe('2026-11-13T03:00:00.000Z');
    expect(missing.aiConsentAcceptedAt).toBeNull();
  });

  it('rejects a profile that omits the field', () => {
    expect(candidateProfileSchema.safeParse(profile).success).toBe(false);
  });
});
