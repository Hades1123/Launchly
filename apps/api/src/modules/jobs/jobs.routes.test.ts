import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from '@/middlewares/error-handler';
import { createJobsRouter } from '@/modules/jobs/jobs.routes';
import { createJobsService } from '@/modules/jobs/jobs.service';
import type { createAuthService } from '@/modules/auth/auth.service';
import type { PrismaClient } from '@/generated/prisma/client';

const JOB_ID = '11111111-1111-4111-8111-111111111111';
const RECRUITER_ID = 'recruiter-owner-id';
const COMPANY_ID = '22222222-2222-4222-8222-222222222222';
const AUTH_HEADER = 'Bearer valid-test-token';

const mockRejectedJob = {
  id: JOB_ID,
  companyId: COMPANY_ID,
  createdById: RECRUITER_ID,
  title: 'Senior Frontend Engineer',
  description: 'Mô tả chi tiết công việc tối thiểu hai mươi ký tự trở lên.',
  level: 'SENIOR' as const,
  location: 'Ho Chi Minh City',
  requirements: ['React', 'TypeScript'],
  benefits: ['Bảo hiểm sức khỏe', 'MacBook Pro'],
  salaryMin: 20000000,
  salaryMax: 40000000,
  publicationStatus: 'REJECTED' as const,
  moderationReason: 'Yêu cầu bổ sung chứng chỉ chuyên môn và mô tả chi tiết hơn.',
  company: {
    id: COMPANY_ID,
    ownerId: RECRUITER_ID,
  },
  createdAt: new Date('2026-11-01T00:00:00Z'),
  updatedAt: new Date('2026-11-02T00:00:00Z'),
};

const validPayload = {
  title: 'Senior Frontend Engineer (Updated)',
  description: 'Mô tả chi tiết công việc đã bổ sung thêm chứng chỉ chuyên môn đầy đủ.',
  level: 'SENIOR' as const,
  location: 'Ho Chi Minh City',
  requirements: ['React', 'TypeScript', 'Next.js'],
  benefits: ['Bảo hiểm sức khỏe', 'MacBook Pro', 'Thưởng hiệu suất'],
  salaryMin: 25000000,
  salaryMax: 45000000,
};

function makeApp(role: 'RECRUITER' | 'CANDIDATE' = 'RECRUITER', currentUserId = RECRUITER_ID) {
  const prisma = {
    job: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };

  const authService = {
    verifyAccessToken: vi.fn(() => ({ userId: currentUserId, sessionId: 'session-1' })),
    getSessionUser: vi.fn(async () => ({ id: currentUserId, role })),
  } as unknown as ReturnType<typeof createAuthService>;

  const app = express();
  app.use(express.json());
  app.use(
    '/jobs',
    createJobsRouter(authService, createJobsService(prisma as unknown as PrismaClient)),
  );
  app.use(errorHandler);

  return { app, prisma };
}

describe('Jobs Module - SCRUM-43 (Edit and resubmit rejected jobs)', () => {
  describe('GET /jobs/:id/rejected', () => {
    it('chặn người dùng không có role RECRUITER (403 FORBIDDEN)', async () => {
      const { app } = makeApp('CANDIDATE');

      const res = await request(app)
        .get(`/jobs/${JOB_ID}/rejected`)
        .set('Authorization', AUTH_HEADER);

      expect(res.status).toBe(403);
    });

    it('từ chối mã ID không phải định dạng UUID (400 VALIDATION_ERROR)', async () => {
      const { app } = makeApp('RECRUITER');

      const res = await request(app)
        .get('/jobs/invalid-id/rejected')
        .set('Authorization', AUTH_HEADER);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('trả về 404 nếu không tìm thấy tin tuyển dụng', async () => {
      const { app, prisma } = makeApp('RECRUITER');
      prisma.job.findUnique.mockResolvedValueOnce(null);

      const res = await request(app)
        .get(`/jobs/${JOB_ID}/rejected`)
        .set('Authorization', AUTH_HEADER);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('chặn nếu Recruiter không sở hữu tin tuyển dụng này (403 FORBIDDEN)', async () => {
      const { app, prisma } = makeApp('RECRUITER', 'other-recruiter-id');
      prisma.job.findUnique.mockResolvedValueOnce(mockRejectedJob);

      const res = await request(app)
        .get(`/jobs/${JOB_ID}/rejected`)
        .set('Authorization', AUTH_HEADER);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('từ chối nếu tin không ở trạng thái REJECTED (400 VALIDATION_ERROR)', async () => {
      const { app, prisma } = makeApp('RECRUITER');
      prisma.job.findUnique.mockResolvedValueOnce({
        ...mockRejectedJob,
        publicationStatus: 'PUBLISHED',
      });

      const res = await request(app)
        .get(`/jobs/${JOB_ID}/rejected`)
        .set('Authorization', AUTH_HEADER);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('trả về dữ liệu tin tuyển dụng kèm moderationReason khi hợp lệ', async () => {
      const { app, prisma } = makeApp('RECRUITER');
      prisma.job.findUnique.mockResolvedValueOnce(mockRejectedJob);

      const res = await request(app)
        .get(`/jobs/${JOB_ID}/rejected`)
        .set('Authorization', AUTH_HEADER);

      expect(res.status).toBe(200);
      expect(res.body.job.id).toBe(JOB_ID);
      expect(res.body.job.moderationReason).toBe(mockRejectedJob.moderationReason);
    });
  });

  describe('PUT /jobs/:id/resubmit', () => {
    it('từ chối khi body không hợp lệ (salaryMax nhỏ hơn salaryMin)', async () => {
      const { app } = makeApp('RECRUITER');

      const res = await request(app)
        .put(`/jobs/${JOB_ID}/resubmit`)
        .set('Authorization', AUTH_HEADER)
        .send({
          ...validPayload,
          salaryMin: 50000000,
          salaryMax: 30000000,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('chặn nộp lại nếu tin tuyển dụng đang không ở trạng thái REJECTED', async () => {
      const { app, prisma } = makeApp('RECRUITER');
      prisma.job.findUnique.mockResolvedValueOnce({
        ...mockRejectedJob,
        publicationStatus: 'PENDING',
      });

      const res = await request(app)
        .put(`/jobs/${JOB_ID}/resubmit`)
        .set('Authorization', AUTH_HEADER)
        .send(validPayload);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(prisma.job.update).not.toHaveBeenCalled();
    });

    it('cập nhật thành công: đổi publicationStatus thành PENDING và bảo lưu moderationReason', async () => {
      const { app, prisma } = makeApp('RECRUITER');
      prisma.job.findUnique.mockResolvedValueOnce(mockRejectedJob);

      const updatedRecord = {
        ...mockRejectedJob,
        ...validPayload,
        publicationStatus: 'PENDING',
        updatedAt: new Date('2026-11-07T00:00:00Z'),
      };
      prisma.job.update.mockResolvedValueOnce(updatedRecord);

      const res = await request(app)
        .put(`/jobs/${JOB_ID}/resubmit`)
        .set('Authorization', AUTH_HEADER)
        .send(validPayload);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Tin tuyển dụng đã được gửi lại để xét duyệt');
      expect(res.body.job.publicationStatus).toBe('PENDING');

      // Đảm bảo prisma.update được gọi với trạng thái PENDING và không đè hay xóa moderationReason
      expect(prisma.job.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: JOB_ID },
          data: expect.objectContaining({
            title: validPayload.title,
            publicationStatus: 'PENDING',
          }),
        }),
      );

      // Xác minh lý do từ chối cũ vẫn được giữ nguyên
      expect(res.body.job.moderationReason).toBe(mockRejectedJob.moderationReason);
    });
  });
});