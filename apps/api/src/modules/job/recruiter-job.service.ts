import type { Prisma, PrismaClient } from '@/generated/prisma/client';
import {
  isJobEditable,
  normalizeVietnamese,
  roundFormatSchema,
  type RecruiterJob,
  type RecruiterJobListItem,
  type SaveJobInput,
} from '@launchly/shared';
import { AppError } from '@/lib/app-error';

const jobSelect = {
  id: true,
  title: true,
  description: true,
  level: true,
  location: true,
  industry: true,
  requirements: true,
  benefits: true,
  salaryMin: true,
  salaryMax: true,
  salaryHidden: true,
  publicationStatus: true,
  moderationReason: true,
  createdAt: true,
  updatedAt: true,
  stages: {
    orderBy: { position: 'asc' },
    select: { id: true, name: true, format: true, estimatedDurationMinutes: true, position: true },
  },
  notes: { orderBy: { position: 'asc' }, select: { id: true, content: true, position: true } },
} as const satisfies Prisma.JobSelect;

type JobRow = Prisma.JobGetPayload<{ select: typeof jobSelect }>;

/** Who may read or change a job: its creator or the owner of its company. */
const accessSelect = {
  createdById: true,
  publicationStatus: true,
  company: { select: { ownerId: true, moderationStatus: true } },
} as const satisfies Prisma.JobSelect;

type AccessRow = Prisma.JobGetPayload<{ select: typeof accessSelect }>;

function assertManages<T extends AccessRow>(job: T | null, userId: string): asserts job is T {
  if (!job) throw new AppError('NOT_FOUND', 'Job not found');
  if (job.createdById !== userId && job.company.ownerId !== userId) {
    throw new AppError('FORBIDDEN', 'You do not manage this job');
  }
}

function toDto(row: JobRow): RecruiterJob {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    level: row.level,
    location: row.location,
    industry: row.industry,
    requirements: row.requirements,
    benefits: row.benefits,
    salary: {
      hidden: row.salaryHidden,
      min: row.salaryMin === null ? null : Number(row.salaryMin),
      max: row.salaryMax === null ? null : Number(row.salaryMax),
    },
    status: row.publicationStatus,
    moderationReason: row.moderationReason,
    // `format` is free text in the database; unknown values read back as "not set".
    rounds: row.stages.map((stage) => ({
      ...stage,
      format: roundFormatSchema.safeParse(stage.format).data ?? null,
    })),
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Column values for a save; rounds and notes get positions 1..n in array order. */
function toJobData(input: SaveJobInput) {
  return {
    title: input.title,
    titleNormalized: normalizeVietnamese(input.title),
    description: input.description,
    level: input.level,
    location: input.location,
    industry: input.industry,
    requirements: input.requirements,
    benefits: input.benefits,
    salaryHidden: input.salary.hidden,
    // A negotiable salary is never stored, so it cannot leak through any query.
    salaryMin: input.salary.hidden ? null : input.salary.min,
    salaryMax: input.salary.hidden ? null : input.salary.max,
    publicationStatus: input.action === 'SUBMIT' ? ('PENDING' as const) : ('DRAFT' as const),
    stages: {
      create: input.rounds.map((round, index) => ({
        name: round.name,
        format: round.format,
        estimatedDurationMinutes: round.estimatedDurationMinutes,
        position: index + 1,
      })),
    },
    notes: {
      create: input.notes.map((content, index) => ({ content, position: index + 1 })),
    },
  };
}

export function createRecruiterJobService(prisma: PrismaClient) {
  /** The server picks the company: the recruiter's single approved one. */
  async function approvedCompanyId(userId: string): Promise<string> {
    const companies = await prisma.company.findMany({
      where: { ownerId: userId },
      select: { id: true, moderationStatus: true },
    });
    const approved = companies.filter((company) => company.moderationStatus === 'APPROVED');
    if (approved.length > 1) {
      throw new AppError('CONFLICT', 'More than one approved company is linked to this account');
    }
    if (approved[0]) return approved[0].id;
    throw new AppError(
      'FORBIDDEN',
      companies.length === 0
        ? 'Register your company before posting a job'
        : 'Your company must be approved before you can post a job',
    );
  }

  return {
    async list(userId: string): Promise<RecruiterJobListItem[]> {
      const rows = await prisma.job.findMany({
        where: { OR: [{ createdById: userId }, { company: { ownerId: userId } }] },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          level: true,
          location: true,
          publicationStatus: true,
          moderationReason: true,
          updatedAt: true,
        },
      });
      return rows.map(({ publicationStatus, updatedAt, ...row }) => ({
        ...row,
        status: publicationStatus,
        updatedAt: updatedAt.toISOString(),
      }));
    },

    async get(jobId: string, userId: string): Promise<RecruiterJob> {
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        select: { ...jobSelect, ...accessSelect },
      });
      assertManages(job, userId);
      return toDto(job);
    },

    /** Creates a draft, or a job waiting for admin approval, with its rounds and notes. */
    async create(userId: string, input: SaveJobInput): Promise<RecruiterJob> {
      const companyId = await approvedCompanyId(userId);
      const row = await prisma.job.create({
        data: { ...toJobData(input), companyId, createdById: userId },
        select: jobSelect,
      });
      return toDto(row);
    },

    /** Saves a draft again or submits it; rounds and notes are replaced in one transaction. */
    async update(jobId: string, userId: string, input: SaveJobInput): Promise<RecruiterJob> {
      return prisma.$transaction(async (tx) => {
        // Two saves of the same draft must not both pass the status check.
        await tx.$queryRaw`SELECT id FROM "Job" WHERE id = ${jobId} FOR UPDATE`;
        const job = await tx.job.findUnique({ where: { id: jobId }, select: accessSelect });
        assertManages(job, userId);
        if (!isJobEditable(job.publicationStatus)) {
          throw new AppError('CONFLICT', 'Only draft jobs can be edited');
        }
        if (job.company.moderationStatus !== 'APPROVED') {
          throw new AppError(
            'FORBIDDEN',
            'Your company must be approved before you can post a job',
          );
        }
        // A draft was never public, so no application points at its rounds.
        await tx.jobStage.deleteMany({ where: { jobId } });
        await tx.jobNote.deleteMany({ where: { jobId } });
        const row = await tx.job.update({
          where: { id: jobId },
          data: toJobData(input),
          select: jobSelect,
        });
        return toDto(row);
      });
    },
  };
}
