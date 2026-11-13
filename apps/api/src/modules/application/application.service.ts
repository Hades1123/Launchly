import type { PrismaClient } from '@/generated/prisma/client';
import type { ApplicationDto, CreateApplicationInput } from '@launchly/shared';
import { AppError } from '@/lib/app-error';
import { publicJobWhere } from '@/modules/job/job.service';

const applicationSelect = {
  id: true,
  jobId: true,
  resumeId: true,
  status: true,
  coverLetter: true,
  currentStageId: true,
  createdAt: true,
} as const;

type ApplicationRow = Omit<ApplicationDto, 'createdAt'> & { createdAt: Date };

function toDto(row: ApplicationRow): ApplicationDto {
  return { ...row, createdAt: row.createdAt.toISOString() };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002'
  );
}

export function createApplicationService(prisma: PrismaClient) {
  return {
    /** A candidate applies to a published job with one of their own CVs. */
    async create(userId: string, input: CreateApplicationInput): Promise<ApplicationDto> {
      const candidate = await prisma.candidateProfile.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!candidate) throw new AppError('FORBIDDEN', 'Create your candidate profile first');

      const job = await prisma.job.findFirst({
        where: { id: input.jobId, ...publicJobWhere },
        select: {
          id: true,
          stages: { orderBy: { position: 'asc' }, take: 1, select: { id: true } },
        },
      });
      if (!job) throw new AppError('NOT_FOUND', 'Job not found');

      const resume = await prisma.resume.findUnique({
        where: { id: input.resumeId },
        select: { id: true, candidateId: true },
      });
      if (!resume) throw new AppError('NOT_FOUND', 'CV not found');
      if (resume.candidateId !== candidate.id) {
        throw new AppError('FORBIDDEN', 'You can only apply with your own CV');
      }

      const existing = await prisma.application.findUnique({
        where: { candidateId_jobId: { candidateId: candidate.id, jobId: job.id } },
        select: { id: true },
      });
      if (existing) throw new AppError('CONFLICT', 'You have already applied to this job');

      try {
        // One create: the application and its first history row are written atomically.
        const created = await prisma.application.create({
          data: {
            candidateId: candidate.id,
            jobId: job.id,
            resumeId: resume.id,
            ...(input.coverLetter ? { coverLetter: input.coverLetter } : {}),
            currentStageId: job.stages[0]?.id ?? null,
            statusHistory: { create: { fromStatus: null, toStatus: 'SUBMITTED' } },
          },
          select: applicationSelect,
        });
        return toDto(created);
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new AppError('CONFLICT', 'You have already applied to this job');
        }
        throw error;
      }
    },
  };
}
