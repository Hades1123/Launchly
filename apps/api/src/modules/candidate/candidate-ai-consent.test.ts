/* eslint-disable @typescript-eslint/no-explicit-any */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://launchly:launchly@localhost:5433/launchly';
process.env.JWT_SECRET = 'change-me-at-least-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'change-me-too-at-least-32-characters';

import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '@/app';
import { prisma } from '@/lib/prisma';
import type { createAuthService } from '@/modules/auth/auth.service';

const userId = '11111111-1111-4111-8111-111111111111';
const profileId = '33333333-3333-4333-8333-333333333333';
const auth = { Authorization: 'Bearer token' };
const consentAt = new Date('2026-11-13T03:00:00.000Z');

function fakeAuthService(role: 'CANDIDATE' | 'RECRUITER' = 'CANDIDATE') {
  return {
    verifyAccessToken: vi.fn(() => ({ userId, sessionId: 'session-1' })),
    getSessionUser: vi.fn(async () => ({ id: userId, role })),
  } as unknown as ReturnType<typeof createAuthService>;
}

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    candidateProfile: { create: vi.fn(), updateMany: vi.fn() },
  },
}));

function userWithProfile(aiConsentAcceptedAt: Date | null) {
  return {
    id: userId,
    email: 'candidate@example.com',
    fullName: 'Test Candidate',
    candidateProfile: {
      id: profileId,
      userId,
      headline: null,
      bio: null,
      location: null,
      schoolMajor: null,
      skills: [],
      projectsActivities: null,
      aiConsentAcceptedAt,
      resumes: [],
      createdAt: new Date('2026-11-01T00:00:00.000Z'),
      updatedAt: new Date('2026-11-01T00:00:00.000Z'),
    },
  };
}

describe('POST /candidates/me/ai-consent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stores the consent time and returns it on the profile', async () => {
    vi.mocked(prisma.user.findUnique as any)
      .mockResolvedValueOnce(userWithProfile(null))
      .mockResolvedValueOnce(userWithProfile(consentAt));
    vi.mocked(prisma.candidateProfile.updateMany as any).mockResolvedValue({ count: 1 });

    const res = await request(createApp(fakeAuthService()))
      .post('/candidates/me/ai-consent')
      .set(auth);

    expect(res.status).toBe(200);
    expect(res.body.aiConsentAcceptedAt).toBe(consentAt.toISOString());
    expect(prisma.candidateProfile.updateMany).toHaveBeenCalledWith({
      where: { userId, aiConsentAcceptedAt: null },
      data: { aiConsentAcceptedAt: expect.any(Date) },
    });
  });

  it('keeps the first timestamp on a second call', async () => {
    vi.mocked(prisma.user.findUnique as any).mockResolvedValue(userWithProfile(consentAt));

    const res = await request(createApp(fakeAuthService()))
      .post('/candidates/me/ai-consent')
      .set(auth);

    expect(res.status).toBe(200);
    expect(res.body.aiConsentAcceptedAt).toBe(consentAt.toISOString());
    expect(prisma.candidateProfile.updateMany).not.toHaveBeenCalled();
  });

  it('returns 403 for a recruiter and 401 without a token', async () => {
    const recruiter = await request(createApp(fakeAuthService('RECRUITER')))
      .post('/candidates/me/ai-consent')
      .set(auth);
    const anonymous = await request(createApp(fakeAuthService())).post('/candidates/me/ai-consent');

    expect(recruiter.status).toBe(403);
    expect(anonymous.status).toBe(401);
    expect(prisma.candidateProfile.updateMany).not.toHaveBeenCalled();
  });
});

describe('GET /candidates/profile consent field', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is null before consent and the ISO time after it', async () => {
    vi.mocked(prisma.user.findUnique as any)
      .mockResolvedValueOnce(userWithProfile(null))
      .mockResolvedValueOnce(userWithProfile(consentAt));
    const app = createApp(fakeAuthService());

    const before = await request(app).get('/candidates/profile').set(auth);
    const after = await request(app).get('/candidates/profile').set(auth);

    expect(before.body.aiConsentAcceptedAt).toBeNull();
    expect(after.body.aiConsentAcceptedAt).toBe(consentAt.toISOString());
  });
});
