import type { PrismaClient } from '@/generated/prisma/client';
import type {
  ApplicationDto,
  CandidateApplicationDetail,
  CandidateApplicationItem,
  CreateApplicationInput,
} from '@launchly/shared';
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

const listSelect = {
  id: true,
  jobId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  job: { select: { title: true, company: { select: { name: true } } } },
  currentStage: { select: { name: true } },
} as const;

type ListRow = {
  id: string;
  jobId: string;
  status: CandidateApplicationItem['status'];
  createdAt: Date;
  updatedAt: Date;
  job: { title: string; company: { name: string } };
  currentStage: { name: string } | null;
};

function toListItem(row: ListRow): CandidateApplicationItem {
  return {
    id: row.id,
    jobId: row.jobId,
    jobTitle: row.job.title,
    companyName: row.job.company.name,
    status: row.status,
    currentStageName: row.currentStage?.name ?? null,
    submittedAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
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

    /** The caller's own applications, newest first. */
    async listMine(userId: string): Promise<CandidateApplicationItem[]> {
      const candidate = await prisma.candidateProfile.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!candidate) return [];
      const rows = await prisma.application.findMany({
        where: { candidateId: candidate.id },
        orderBy: { createdAt: 'desc' },
        select: listSelect,
      });
      return rows.map(toListItem);
    },

    /** One of the caller's applications with its history and the job's stages; anyone else's is a 404. */
    async getMine(userId: string, id: string): Promise<CandidateApplicationDetail> {
      const candidate = await prisma.candidateProfile.findUnique({
        where: { userId },
        select: { id: true },
      });
      const notFound = () => new AppError('NOT_FOUND', 'Application not found');
      if (!candidate) throw notFound();
      const row = await prisma.application.findFirst({
        where: { id, candidateId: candidate.id },
        select: {
          ...listSelect,
          resumeId: true,
          coverLetter: true,
          statusHistory: {
            orderBy: [{ changedAt: 'asc' }, { id: 'asc' }],
            select: { fromStatus: true, toStatus: true, note: true, changedAt: true },
          },
          job: {
            select: {
              title: true,
              company: { select: { name: true } },
              stages: {
                orderBy: { position: 'asc' },
                select: { id: true, name: true, position: true },
              },
            },
          },
        },
      });
      if (!row) throw notFound();
      return {
        ...toListItem(row),
        resumeId: row.resumeId,
        coverLetter: row.coverLetter,
        history: row.statusHistory.map((h) => ({
          fromStatus: h.fromStatus,
          toStatus: h.toStatus,
          note: h.note,
          changedAt: h.changedAt.toISOString(),
        })),
        stages: row.job.stages,
      };
    },
  };
}
