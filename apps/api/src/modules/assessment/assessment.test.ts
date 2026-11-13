/* eslint-disable @typescript-eslint/no-explicit-any */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://launchly:launchly@localhost:5433/launchly';
process.env.JWT_SECRET = 'change-me-at-least-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'change-me-too-at-least-32-characters';

import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { assessmentDtoSchema, apiErrorSchema } from '@launchly/shared';
import { errorHandler } from '@/middlewares/error-handler';
import { createAssessmentRouter } from '@/modules/assessment/assessment.routes';
import { createAssessmentService } from '@/modules/assessment/assessment.service';
import type { createAuthService } from '@/modules/auth/auth.service';
import type { PrismaClient } from '@/generated/prisma/client';
import { MockAiProvider } from '@/providers/ai/mock-ai.provider';
import type { AiProvider, GenerateJsonInput } from '@/providers/ai/ai.interface';

const JOB = '11111111-1111-4111-8111-111111111111';
const RESUME = '22222222-2222-4222-8222-222222222222';
const auth = { Authorization: 'Bearer token' };
const CV_TEXT = 'Nguyen Van A. Built a React dashboard with TypeScript.';

const validResult = {
  score: 74,
  matched: [
    { category: 'skill', point: 'React' },
    { category: 'project', point: 'Dashboard project' },
  ],
  missing: [
    { skill: 'GraphQL', importance: 'required' },
    { skill: 'Docker', importance: 'nice_to_have' },
  ],
  suggestions: ['Add metrics', 'Link your projects', 'Mention testing'],
  evidence: ['Built a React dashboard with TypeScript'],
};

type Options = {
  role?: 'CANDIDATE' | 'RECRUITER';
  ai?: AiProvider;
  timeoutMs?: number;
};

function makeApp({ role = 'CANDIDATE', ai, timeoutMs }: Options = {}) {
  const prisma = {
    candidateProfile: {
      findUnique: vi.fn<(args: any) => Promise<any>>(async () => ({
        id: 'profile-1',
        aiConsentAcceptedAt: new Date('2026-11-12T00:00:00Z'),
        headline: 'SECRET-HEADLINE',
        bio: 'SECRET-BIO',
        location: 'SECRET-LOCATION',
        user: { fullName: 'SECRET-NAME', email: 'secret@example.com' },
      })),
    },
    resume: {
      findUnique: vi.fn<(args: any) => Promise<any>>(async () => ({
        id: RESUME,
        candidateId: 'profile-1',
        storageKey: 'key-1',
      })),
    },
    job: {
      findFirst: vi.fn<(args: any) => Promise<any>>(async () => ({
        title: 'Frontend Intern',
        description: 'Build UI with React.',
        requirements: ['React', 'GraphQL'],
      })),
    },
    aiAssessment: {
      create: vi.fn<(args: any) => Promise<any>>(async ({ data }: any) => ({
        id: '55555555-5555-4555-8555-555555555555',
        createdAt: new Date('2026-11-13T00:00:00Z'),
        ...data,
      })),
    },
  };
  const provider =
    ai ??
    new MockAiProvider({
      respond: (input: GenerateJsonInput<unknown>) => (void input, validResult),
    });
  const authService = {
    verifyAccessToken: vi.fn(() => ({ userId: 'user-1', sessionId: 's' })),
    getSessionUser: vi.fn(async () => ({ id: 'user-1', role })),
  } as unknown as ReturnType<typeof createAuthService>;
  const service = createAssessmentService(prisma as unknown as PrismaClient, {
    ai: provider,
    readResumeText: vi.fn(async () => CV_TEXT),
    ...(timeoutMs !== undefined ? { timeoutMs } : {}),
  });
  const app = express();
  app.use(express.json());
  app.use('/assessments', createAssessmentRouter(authService, service));
  app.use(errorHandler);
  return { app, prisma };
}

const post = (ctx: ReturnType<typeof makeApp>, body: unknown) =>
  request(ctx.app)
    .post('/assessments')
    .set(auth)
    .send(body as object);

describe('POST /assessments', () => {
  let ctx: ReturnType<typeof makeApp>;
  beforeEach(() => {
    ctx = makeApp();
  });

  it('returns and stores a COMPLETED assessment for a jobId', async () => {
    const res = await post(ctx, { resumeId: RESUME, jobId: JOB });

    expect(res.status).toBe(201);
    expect(assessmentDtoSchema.safeParse(res.body).success).toBe(true);
    expect(res.body).toMatchObject({ status: 'COMPLETED', resumeId: RESUME, jobId: JOB });
    expect(res.body.result.score).toBe(74);
    expect(res.body.result.missing[0]).toEqual({ skill: 'GraphQL', importance: 'required' });

    expect(ctx.prisma.aiAssessment.create).toHaveBeenCalledTimes(1);
    const data = ctx.prisma.aiAssessment.create.mock.calls[0]![0].data;
    expect(data).toMatchObject({
      resumeId: RESUME,
      jobId: JOB,
      status: 'COMPLETED',
      score: 74,
      matchedSkills: ['React', 'Dashboard project'],
      missingSkills: ['GraphQL', 'Docker'],
      suggestions: validResult.suggestions,
      evidence: 'Built a React dashboard with TypeScript',
      result: validResult,
    });
    expect(ctx.prisma.job.findFirst.mock.calls[0]![0].where).toMatchObject({
      id: JOB,
      publicationStatus: 'PUBLISHED',
    });
  });

  it('accepts a pasted jobDescription and stores it', async () => {
    const res = await post(ctx, { resumeId: RESUME, jobDescription: 'We need a React dev.' });

    expect(res.status).toBe(201);
    expect(res.body.jobId).toBeNull();
    expect(ctx.prisma.job.findFirst).not.toHaveBeenCalled();
    expect(ctx.prisma.aiAssessment.create.mock.calls[0]![0].data).toMatchObject({
      suppliedJobDescription: 'We need a React dev.',
    });
  });

  it('404 when the job is not public', async () => {
    ctx.prisma.job.findFirst.mockResolvedValue(null);
    const res = await post(ctx, { resumeId: RESUME, jobId: JOB });

    expect(res.status).toBe(404);
    expect(ctx.prisma.aiAssessment.create).not.toHaveBeenCalled();
  });

  it('400 when neither or both of jobId and jobDescription are sent', async () => {
    expect((await post(ctx, { resumeId: RESUME })).status).toBe(400);
    expect(
      (await post(ctx, { resumeId: RESUME, jobId: JOB, jobDescription: 'We hire.' })).status,
    ).toBe(400);
    expect(ctx.prisma.aiAssessment.create).not.toHaveBeenCalled();
  });

  it("403 for another candidate's resume", async () => {
    ctx.prisma.resume.findUnique.mockResolvedValue({
      id: RESUME,
      candidateId: 'someone-else',
      storageKey: 'k',
    });
    const res = await post(ctx, { resumeId: RESUME, jobId: JOB });

    expect(res.status).toBe(403);
    expect(ctx.prisma.aiAssessment.create).not.toHaveBeenCalled();
  });

  it('403 when AI consent was not accepted', async () => {
    ctx.prisma.candidateProfile.findUnique.mockResolvedValue({
      id: 'profile-1',
      aiConsentAcceptedAt: null,
    });
    const res = await post(ctx, { resumeId: RESUME, jobId: JOB });

    expect(res.status).toBe(403);
    expect(ctx.prisma.aiAssessment.create).not.toHaveBeenCalled();
  });

  it('is forbidden for a recruiter and needs a session', async () => {
    const recruiter = makeApp({ role: 'RECRUITER' });
    expect((await post(recruiter, { resumeId: RESUME, jobId: JOB })).status).toBe(403);
    const anonymous = await request(ctx.app)
      .post('/assessments')
      .send({ resumeId: RESUME, jobId: JOB });
    expect(anonymous.status).toBe(401);
  });

  it('a provider timeout stores a FAILED row and returns an error', async () => {
    const slow: AiProvider = { generateJson: () => new Promise(() => {}) };
    const slowCtx = makeApp({ ai: slow, timeoutMs: 20 });
    const res = await post(slowCtx, { resumeId: RESUME, jobId: JOB });

    expect(res.status).toBe(503);
    expect(apiErrorSchema.safeParse(res.body).success).toBe(true);
    expect(res.body.error.code).toBe('AI_UNAVAILABLE');
    const data = slowCtx.prisma.aiAssessment.create.mock.calls[0]![0].data;
    expect(data.status).toBe('FAILED');
    expect(data.failureReason).toMatch(/timed out/i);
    expect(data.score).toBeUndefined();
  });

  it('invalid provider output stores a FAILED row and returns an error', async () => {
    const bad = makeApp({
      ai: new MockAiProvider({ respond: () => ({ score: 500, suggestions: [] }) }),
    });
    const res = await post(bad, { resumeId: RESUME, jobId: JOB });

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('AI_UNAVAILABLE');
    const data = bad.prisma.aiAssessment.create.mock.calls[0]![0].data;
    expect(data.status).toBe('FAILED');
    expect(data.failureReason).toBeTruthy();
  });

  it('the prompt contains CV and job text only, no profile PII', async () => {
    const seen: GenerateJsonInput<unknown>[] = [];
    const spy = makeApp({
      ai: new MockAiProvider({
        respond: (input) => {
          seen.push(input);
          return validResult;
        },
      }),
    });
    await post(spy, { resumeId: RESUME, jobId: JOB });

    const sent = `${seen[0]!.system ?? ''}\n${seen[0]!.prompt}`;
    expect(sent).toContain(CV_TEXT);
    expect(sent).toContain('Frontend Intern');
    expect(sent).toContain('Build UI with React.');
    for (const secret of [
      'SECRET-NAME',
      'secret@example.com',
      'SECRET-HEADLINE',
      'SECRET-BIO',
      'SECRET-LOCATION',
    ]) {
      expect(sent).not.toContain(secret);
    }
    // Only the consent flag and id are read from the profile; nothing else is selected.
    expect(spy.prisma.candidateProfile.findUnique.mock.calls[0]![0].select).toEqual({
      id: true,
      aiConsentAcceptedAt: true,
    });
  });
});
