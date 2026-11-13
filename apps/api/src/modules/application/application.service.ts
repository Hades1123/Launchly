import type { PrismaClient } from '@/generated/prisma/client';
import type { Readable } from 'node:stream';
import type {
  ApplicationDto,
  CandidateApplicationDetail,
  CandidateApplicationItem,
  CreateApplicationInput,
  RecruiterApplication,
  UpdateApplicationStatusInput,
} from '@launchly/shared';
import { AppError } from '@/lib/app-error';
import { publicJobWhere } from '@/modules/job/job.service';
import { getStorageProvider, type StorageProvider } from '@/providers/storage';

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

const applicantSelect = {
  id: true,
  status: true,
  createdAt: true,
  candidate: {
    select: { headline: true, skills: true, user: { select: { fullName: true } } },
  },
  resume: { select: { id: true, fileName: true } },
  currentStage: { select: { id: true, name: true } },
} as const;

type ApplicantRow = {
  id: string;
  status: RecruiterApplication['status'];
  createdAt: Date;
  candidate: { headline: string | null; skills: string[]; user: { fullName: string | null } };
  resume: { id: string; fileName: string };
  currentStage: { id: string; name: string } | null;
};

function toApplicant(row: ApplicantRow): RecruiterApplication {
  return {
    id: row.id,
    status: row.status,
    submittedAt: row.createdAt.toISOString(),
    candidate: {
      name: row.candidate.user.fullName ?? '',
      headline: row.candidate.headline,
      skills: row.candidate.skills,
    },
    resume: row.resume,
    currentStage: row.currentStage,
  };
}

type JobOwnerRow = { createdById: string; company: { ownerId: string } };

/** A recruiter manages a job they created or whose company they own. */
function isJobOwner(job: JobOwnerRow, userId: string): boolean {
  return job.createdById === userId || job.company.ownerId === userId;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002'
  );
}

export function createApplicationService(prisma: PrismaClient, storage?: StorageProvider) {
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

    /** The applicants of a job, newest first, for the recruiter who manages it. */
    async listForJob(userId: string, jobId: string): Promise<RecruiterApplication[]> {
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        select: { createdById: true, company: { select: { ownerId: true } } },
      });
      if (!job) throw new AppError('NOT_FOUND', 'Job not found');
      if (!isJobOwner(job, userId)) throw new AppError('FORBIDDEN', 'You do not manage this job');
      const rows = await prisma.application.findMany({
        where: { jobId },
        orderBy: { createdAt: 'desc' },
        select: applicantSelect,
      });
      return rows.map(toApplicant);
    },

    /** Sets a new status (and optionally a stage); the history row is written in the same update. */
    async updateStatus(
      userId: string,
      id: string,
      input: UpdateApplicationStatusInput,
    ): Promise<RecruiterApplication> {
      const current = await prisma.application.findUnique({
        where: { id },
        select: {
          id: true,
          jobId: true,
          status: true,
          job: { select: { createdById: true, company: { select: { ownerId: true } } } },
        },
      });
      if (!current) throw new AppError('NOT_FOUND', 'Application not found');
      if (!isJobOwner(current.job, userId)) {
        throw new AppError('FORBIDDEN', 'You do not manage this job');
      }
      if (current.status === input.status) {
        throw new AppError('VALIDATION_ERROR', `The application is already ${input.status}`);
      }
      if (input.stageId) {
        const stage = await prisma.jobStage.findFirst({
          where: { id: input.stageId, jobId: current.jobId },
          select: { id: true },
        });
        if (!stage) throw new AppError('VALIDATION_ERROR', 'That stage belongs to another job');
      }
      const updated = await prisma.application.update({
        where: { id },
        data: {
          status: input.status,
          ...(input.stageId ? { currentStageId: input.stageId } : {}),
          statusHistory: {
            create: {
              fromStatus: current.status,
              toStatus: input.status,
              ...(input.note ? { note: input.note } : {}),
            },
          },
        },
        select: applicantSelect,
      });
      return toApplicant(updated);
    },

    /** The CV file of an application, for the recruiter who manages the job or the candidate who applied. */
    async getResumeFile(
      userId: string,
      role: 'CANDIDATE' | 'RECRUITER' | 'ADMIN',
      id: string,
    ): Promise<{ stream: Readable; fileName: string; contentType: string }> {
      const row = await prisma.application.findUnique({
        where: { id },
        select: {
          id: true,
          candidate: { select: { userId: true } },
          resume: { select: { storageKey: true, fileName: true, contentType: true } },
          job: { select: { createdById: true, company: { select: { ownerId: true } } } },
        },
      });
      if (!row) throw new AppError('NOT_FOUND', 'Application not found');
      const allowed =
        role === 'CANDIDATE'
          ? row.candidate.userId === userId
          : role === 'RECRUITER' && isJobOwner(row.job, userId);
      if (!allowed) throw new AppError('FORBIDDEN', 'You cannot open this CV');
      const stream = await (storage ?? getStorageProvider()).getStream(row.resume.storageKey);
      return { stream, fileName: row.resume.fileName, contentType: row.resume.contentType };
    },
  };
}
