/* eslint-disable @typescript-eslint/no-explicit-any */
// Ensure required test environment variables before module imports
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://launchly:launchly@localhost:5433/launchly';
process.env.JWT_SECRET = 'change-me-at-least-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'change-me-too-at-least-32-characters';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '@/app';
import { prisma } from '@/lib/prisma';
import type { createAuthService } from '@/modules/auth/auth.service';

const testUserId = '11111111-1111-1111-1111-111111111111';
const otherUserId = '22222222-2222-2222-2222-222222222222';
const auth = { Authorization: 'Bearer token' };

function fakeAuthService(role: 'CANDIDATE' | 'RECRUITER' = 'CANDIDATE') {
  return {
    verifyAccessToken: vi.fn(() => ({ userId: testUserId, sessionId: 'session-1' })),
    getSessionUser: vi.fn(async () => ({ id: testUserId, role })),
  } as unknown as ReturnType<typeof createAuthService>;
}

// Mock Prisma for unit and integration testing
vi.mock('@/lib/prisma', () => {
  const mockUser = {
    findUnique: vi.fn(),
    update: vi.fn(),
  };
  const mockCandidateProfile = {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  };
  const mockResume = {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const mockApplication = { updateMany: vi.fn() };
  const mockTransaction = vi.fn(async (operations) => {
    if (typeof operations === 'function') {
      return operations(prisma);
    }
    return Promise.all(operations);
  });

  return {
    prisma: {
      user: mockUser,
      candidateProfile: mockCandidateProfile,
      resume: mockResume,
      application: mockApplication,
      $transaction: mockTransaction,
    },
  };
});

describe('Candidate Profile and CV Module', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp(fakeAuthService());
  });

  describe('Authentication & Authorization Guards', () => {
    it('returns 401 Unauthorized when request lacks authentication', async () => {
      const res = await request(app).get('/candidates/profile');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('returns 403 Forbidden when user role is not CANDIDATE', async () => {
      const res = await request(createApp(fakeAuthService('RECRUITER')))
        .get('/candidates/profile')
        .set(auth);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('User Story 1 - Profile Information Management', () => {
    it('retrieves candidate profile successfully', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: testUserId,
        email: 'candidate@test.com',
        fullName: 'John Doe',
        role: 'CANDIDATE',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        candidateProfile: {
          id: '11111111-1111-1111-1111-111111111112',
          userId: testUserId,
          headline: 'Aspiring Frontend Engineer',
          bio: 'Passionate about React and UI/UX',
          location: 'Ho Chi Minh City',
          schoolMajor: 'Computer Science',
          skills: ['TypeScript', 'Node.js'],
          projectsActivities: 'Open source contributor',
          resumes: [],
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-01'),
        },
      } as any);

      const res = await request(app).get('/candidates/profile').set(auth);

      expect(res.status).toBe(200);
      expect(res.body.fullName).toBe('John Doe');
      expect(res.body.headline).toBe('Aspiring Frontend Engineer');
      expect(res.body.schoolMajor).toBe('Computer Science');
      expect(res.body.skills).toEqual(['TypeScript', 'Node.js']);
    });

    it('uses the email local part as fullName when the account has no name', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: testUserId,
        email: 'new.candidate@gmail.com',
        fullName: null,
        role: 'CANDIDATE',
        candidateProfile: {
          id: '11111111-1111-1111-1111-111111111112',
          userId: testUserId,
          headline: null,
          bio: null,
          location: null,
          schoolMajor: null,
          skills: [],
          projectsActivities: null,
          resumes: [],
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-01'),
        },
      } as any);

      const res = await request(app).get('/candidates/profile').set(auth);

      expect(res.status).toBe(200);
      expect(res.body.fullName).toBe('new.candidate');
    });

    it('rejects update when fullName is blank or whitespace-only', async () => {
      const res = await request(app).put('/candidates/profile').set(auth).send({
        fullName: '   ',
        schoolMajor: 'Software Engineering',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('successfully updates profile and persists changes', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: testUserId,
        fullName: 'Old Name',
      } as any);

      vi.mocked(prisma.user.update).mockResolvedValueOnce({
        id: testUserId,
        fullName: 'New Candidate Name',
      } as any);

      vi.mocked(prisma.candidateProfile.upsert).mockResolvedValueOnce({
        id: '11111111-1111-1111-1111-111111111112',
        userId: testUserId,
        headline: 'Junior Developer',
        bio: 'Self-motivated coder',
        location: 'Hanoi',
        schoolMajor: 'Information Technology',
        skills: ['React', 'Next.js'],
        projectsActivities: 'Hackathon finalist',
        resumes: [],
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-02'),
      } as any);

      const res = await request(app)
        .put('/candidates/profile')
        .set(auth)
        .send({
          fullName: 'New Candidate Name',
          headline: 'Junior Developer',
          bio: 'Self-motivated coder',
          location: 'Hanoi',
          schoolMajor: 'Information Technology',
          skills: ['React', 'Next.js'],
          projectsActivities: 'Hackathon finalist',
        });

      expect(res.status).toBe(200);
      expect(res.body.fullName).toBe('New Candidate Name');
      expect(res.body.schoolMajor).toBe('Information Technology');
    });
  });

  describe('User Story 2 & 3 - CV Document Lifecycle (Upload, Replace, Delete)', () => {
    it('rejects CV upload when file is missing', async () => {
      const res = await request(app).post('/candidates/cv').set(auth);

      expect(res.status).toBe(400);
    });

    it('rejects CV upload when file is not a valid PDF (invalid magic bytes)', async () => {
      const invalidBuffer = Buffer.from('NOT A PDF FILE TEXT DATA');

      const res = await request(app)
        .post('/candidates/cv')
        .set(auth)
        .attach('cv', invalidBuffer, 'fake.pdf');

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('invalid magic bytes');
    });

    it('successfully uploads valid PDF and updates metadata', async () => {
      const validPdfBuffer = Buffer.from('%PDF-1.7\nSample valid content');

      vi.mocked(prisma.candidateProfile.findUnique).mockResolvedValueOnce({
        id: '11111111-1111-1111-1111-111111111112',
        userId: testUserId,
        resumes: [],
      } as any);

      vi.mocked(prisma.resume.create).mockResolvedValueOnce({
        id: '22222222-2222-2222-2222-222222222223',
        candidateId: '11111111-1111-1111-1111-111111111112',
        fileName: 'my_resume.pdf',
        storageKey: 'mock-storage-key.pdf',
        contentType: 'application/pdf',
        sizeBytes: validPdfBuffer.length,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const res = await request(app)
        .post('/candidates/cv')
        .set(auth)
        .attach('cv', validPdfBuffer, 'my_resume.pdf');

      expect(res.status).toBe(201);
      expect(res.body.originalFileName).toBe('my_resume.pdf');
      expect(res.body.fileSize).toBe(validPdfBuffer.length);
    });

    it('replaces existing CV and cleans up old storage file', async () => {
      const validPdfBuffer = Buffer.from('%PDF-1.7\nUpdated valid content');

      vi.mocked(prisma.candidateProfile.findUnique).mockResolvedValueOnce({
        id: '11111111-1111-1111-1111-111111111112',
        userId: testUserId,
        resumes: [
          {
            id: 'old-resume-id',
            storageKey: 'old-file-uuid.pdf',
            _count: { applications: 0, assessments: 0 },
          },
        ],
      } as any);

      vi.mocked(prisma.resume.findMany).mockResolvedValueOnce([
        {
          id: 'old-resume-id',
          storageKey: 'old-file-uuid.pdf',
          _count: { applications: 0, assessments: 0 },
        },
      ] as any);
      vi.mocked(prisma.resume.delete).mockResolvedValueOnce({} as any);

      vi.mocked(prisma.resume.create).mockResolvedValueOnce({
        id: '22222222-2222-2222-2222-222222222224',
        candidateId: '11111111-1111-1111-1111-111111111112',
        fileName: 'updated_cv.pdf',
        storageKey: 'new-file-uuid.pdf',
        contentType: 'application/pdf',
        sizeBytes: validPdfBuffer.length,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const res = await request(app)
        .post('/candidates/cv')
        .set(auth)
        .attach('cv', validPdfBuffer, 'updated_cv.pdf');

      expect(res.status).toBe(201);
      expect(res.body.originalFileName).toBe('updated_cv.pdf');
      expect(prisma.resume.delete).toHaveBeenCalledWith({ where: { id: 'old-resume-id' } });
    });

    it('deletes CV and clears records', async () => {
      vi.mocked(prisma.candidateProfile.findUnique).mockResolvedValueOnce({
        id: '11111111-1111-1111-1111-111111111112',
        userId: testUserId,
        resumes: [
          {
            id: 'resume-to-delete-id',
            storageKey: 'file-to-delete.pdf',
            _count: { applications: 0, assessments: 0 },
          },
        ],
      } as any);

      vi.mocked(prisma.resume.delete).mockResolvedValueOnce({} as any);

      const res = await request(app).delete('/candidates/cv').set(auth);

      expect(res.status).toBe(204);
      expect(prisma.resume.delete).toHaveBeenCalledWith({
        where: { id: 'resume-to-delete-id' },
      });
    });

    it('keeps a referenced old CV and its file when replacing (no 500)', async () => {
      const validPdfBuffer = Buffer.from('%PDF-1.7\nUpdated valid content');
      vi.mocked(prisma.candidateProfile.findUnique).mockResolvedValueOnce({
        id: '11111111-1111-1111-1111-111111111112',
        userId: testUserId,
        resumes: [
          {
            id: 'applied-resume-id',
            storageKey: 'applied-file.pdf',
            _count: { applications: 1, assessments: 0 },
          },
        ],
      } as any);
      vi.mocked(prisma.resume.findMany).mockResolvedValueOnce([
        {
          id: 'applied-resume-id',
          storageKey: 'applied-file.pdf',
          _count: { applications: 1, assessments: 0 },
        },
      ] as any);
      vi.mocked(prisma.resume.create).mockResolvedValueOnce({
        id: '22222222-2222-2222-2222-222222222225',
        candidateId: '11111111-1111-1111-1111-111111111112',
        fileName: 'new.pdf',
        storageKey: 'new.pdf',
        contentType: 'application/pdf',
        sizeBytes: validPdfBuffer.length,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const res = await request(app)
        .post('/candidates/cv')
        .set(auth)
        .attach('cv', validPdfBuffer, 'new.pdf');

      expect(res.status).toBe(201);
      expect(prisma.resume.delete).not.toHaveBeenCalled();
    });

    it('moves open applications onto the new CV so recruiters see it', async () => {
      const validPdfBuffer = Buffer.from('%PDF-1.7\nUpdated valid content');
      vi.mocked(prisma.candidateProfile.findUnique).mockResolvedValueOnce({
        id: 'profile-1',
        userId: testUserId,
        resumes: [
          { id: 'old-id', storageKey: 'old.pdf', _count: { applications: 2, assessments: 0 } },
        ],
      } as any);
      vi.mocked(prisma.resume.create).mockResolvedValueOnce({
        id: 'new-id',
        fileName: 'new.pdf',
        sizeBytes: validPdfBuffer.length,
        createdAt: new Date(),
      } as any);
      // After the move only a closed (REJECTED) application still uses the old CV.
      vi.mocked(prisma.resume.findMany).mockResolvedValueOnce([
        { id: 'old-id', storageKey: 'old.pdf', _count: { applications: 1, assessments: 0 } },
      ] as any);

      const res = await request(app)
        .post('/candidates/cv')
        .set(auth)
        .attach('cv', validPdfBuffer, 'new.pdf');

      expect(res.status).toBe(201);
      expect(prisma.application.updateMany).toHaveBeenCalledWith({
        where: {
          candidateId: 'profile-1',
          status: { in: ['SUBMITTED', 'SCREENING', 'INTERVIEW', 'OFFER'] },
        },
        data: { resumeId: 'new-id' },
      });
      expect(prisma.resume.delete).not.toHaveBeenCalled();
    });

    it('deletes the DB row before the stored file when replacing an unreferenced CV', async () => {
      const { CandidateService } = await import('./candidate.service');
      const order: string[] = [];
      const storage = {
        save: vi.fn(async () => 'new-key.pdf'),
        delete: vi.fn(async () => {
          order.push('storage');
        }),
      } as any;
      vi.mocked(prisma.candidateProfile.findUnique).mockResolvedValueOnce({
        id: 'p1',
        resumes: [{ id: 'r1', storageKey: 'old.pdf', _count: { applications: 0, assessments: 0 } }],
      } as any);
      vi.mocked(prisma.resume.findMany).mockResolvedValueOnce([
        { id: 'r1', storageKey: 'old.pdf', _count: { applications: 0, assessments: 0 } },
      ] as any);
      vi.mocked(prisma.resume.delete).mockImplementationOnce((async () => {
        order.push('db');
      }) as any);
      vi.mocked(prisma.resume.create).mockResolvedValueOnce({
        id: 'r2',
        fileName: 'a.pdf',
        sizeBytes: 1,
        createdAt: new Date(),
      } as any);

      await new CandidateService(storage).uploadCv(testUserId, Buffer.from('%PDF-1.7\nx'), 'a.pdf');

      expect(order).toEqual(['db', 'storage']);
    });

    it('returns 409 and keeps the file when deleting a CV used by an application', async () => {
      const { CandidateService } = await import('./candidate.service');
      const storage = { delete: vi.fn() } as any;
      vi.mocked(prisma.candidateProfile.findUnique).mockResolvedValueOnce({
        id: 'p1',
        resumes: [
          { id: 'r1', storageKey: 'used.pdf', _count: { applications: 0, assessments: 1 } },
        ],
      } as any);

      await expect(new CandidateService(storage).deleteCv(testUserId)).rejects.toMatchObject({
        code: 'CONFLICT',
      });
      expect(storage.delete).not.toHaveBeenCalled();
      expect(prisma.resume.delete).not.toHaveBeenCalled();
    });

    it('DELETE /candidates/cv responds 409 for a referenced CV', async () => {
      vi.mocked(prisma.candidateProfile.findUnique).mockResolvedValueOnce({
        id: 'p1',
        resumes: [
          { id: 'r1', storageKey: 'used.pdf', _count: { applications: 1, assessments: 0 } },
        ],
      } as any);

      const res = await request(app).delete('/candidates/cv').set(auth);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });
  });

  describe('User Story 4 - Owner-Only CV Privacy', () => {
    it('returns 403 Forbidden when requesting another user CV', async () => {
      const { CandidateService } = await import('./candidate.service');
      const service = new CandidateService();

      await expect(service.getCvStream(testUserId, otherUserId)).rejects.toThrow(
        'Forbidden: You can only access your own CV',
      );
    });

    it('returns 404 when candidate has not uploaded a CV', async () => {
      vi.mocked(prisma.candidateProfile.findUnique).mockResolvedValueOnce({
        id: '11111111-1111-1111-1111-111111111112',
        userId: testUserId,
        resumes: [],
      } as any);

      const res = await request(app).get('/candidates/cv').set(auth);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
