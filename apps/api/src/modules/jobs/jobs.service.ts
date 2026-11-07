import type { PrismaClient } from '@/generated/prisma/client';
import type { ResubmitJobInput } from '@launchly/shared';
import { AppError } from '@/lib/app-error';

export function createJobsService(prisma: PrismaClient) {
  return {
    async getRejectedJobForEdit(jobId: string, userId: string) {
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: {
          company: true,
        },
      });

      if (!job) {
        throw new AppError('NOT_FOUND', 'Không tìm thấy tin tuyển dụng');
      }

      // Kiểm tra quyền sở hữu (người tạo hoặc chủ công ty)
      if (job.createdById !== userId && job.company.ownerId !== userId) {
        throw new AppError('FORBIDDEN', 'Bạn không có quyền chỉnh sửa tin tuyển dụng này');
      }

      // Chỉ tin bị từ chối mới thuộc luồng chỉnh sửa nộp lại
      if (job.publicationStatus !== 'REJECTED') {
        throw new AppError('VALIDATION_ERROR', 'Chỉ có thể chỉnh sửa nộp lại tin tuyển dụng đang ở trạng thái bị từ chối');
      }

      return job;
    },

    async resubmitRejectedJob(jobId: string, userId: string, data: ResubmitJobInput) {
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: {
          company: true,
        },
      });

      if (!job) {
        throw new AppError('NOT_FOUND', 'Không tìm thấy tin tuyển dụng');
      }

      if (job.createdById !== userId && job.company.ownerId !== userId) {
        throw new AppError('FORBIDDEN', 'Bạn không có quyền nộp lại tin tuyển dụng này');
      }

      if (job.publicationStatus !== 'REJECTED') {
        throw new AppError('VALIDATION_ERROR', 'Chỉ có thể nộp lại tin tuyển dụng đang ở trạng thái bị từ chối');
      }

      // Cập nhật thông tin, chuyển status sang PENDING, bảo lưu moderationReason
      const updatedJob = await prisma.job.update({
        where: { id: jobId },
        data: {
          title: data.title,
          description: data.description,
          level: data.level,
          location: data.location,
          requirements: data.requirements,
          benefits: data.benefits,
          salaryMin: data.salaryMin !== undefined ? data.salaryMin : undefined,
          salaryMax: data.salaryMax !== undefined ? data.salaryMax : undefined,
          publicationStatus: 'PENDING',
        },
      });

      return updatedJob;
    },
  };
}