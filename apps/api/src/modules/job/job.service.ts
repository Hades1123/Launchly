import type { PrismaClient, Prisma } from '@/generated/prisma/client';
import { prisma as defaultPrisma } from '@/lib/prisma';
import type { JobFilterQuery, PublicJobListResponse, PublicJobItem } from '@launchly/shared';
import { normalizeVietnamese, roundFormatSchema, type RoundFormat } from '@launchly/shared';
import type { PublicJobDetail } from '@launchly/shared';
import { AppError } from '@/lib/app-error';
import { salarySelect, toPublicSalary } from './job-salary';

/** The single public listing rule, shared by search and detail. */
export const publicJobWhere = {
  publicationStatus: 'PUBLISHED',
  company: { moderationStatus: 'APPROVED' },
} as const satisfies Prisma.JobWhereInput;

export class JobService {
  constructor(private readonly prismaClient: PrismaClient = defaultPrisma) {}

  async searchJobs(query: JobFilterQuery): Promise<PublicJobListResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    // Build Prisma where clause enforcing the public listing rule:
    // Only jobs that are PUBLISHED and belong to an APPROVED company are returned.
    const andConditions: Prisma.JobWhereInput[] = [
      { publicationStatus: publicJobWhere.publicationStatus },
      { company: publicJobWhere.company },
    ];

    if (query.level) {
      andConditions.push({ level: query.level });
    }

    if (query.industry) {
      andConditions.push({
        industry: { equals: query.industry, mode: 'insensitive' },
      });
    }

    if (query.location) {
      andConditions.push({
        location: { contains: query.location, mode: 'insensitive' },
      });
    }

    if (query.keyword) {
      const rawKeyword = query.keyword;
      const normalizedKeyword = normalizeVietnamese(rawKeyword);

      const keywordOrConditions: Prisma.JobWhereInput[] = [
        { title: { contains: rawKeyword, mode: 'insensitive' } },
        { company: { name: { contains: rawKeyword, mode: 'insensitive' } } },
      ];

      if (normalizedKeyword.length > 0) {
        keywordOrConditions.push(
          { titleNormalized: { contains: normalizedKeyword } },
          { company: { nameNormalized: { contains: normalizedKeyword } } },
        );
      }

      andConditions.push({ OR: keywordOrConditions });
    }

    const where: Prisma.JobWhereInput = { AND: andConditions };

    const [jobs, total] = await Promise.all([
      this.prismaClient.job.findMany({
        where,
        skip,
        take: limit,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              website: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prismaClient.job.count({ where }),
    ]);

    const data: PublicJobItem[] = jobs.map((job) => ({
      id: job.id,
      title: job.title,
      level: job.level,
      location: job.location,
      industry: job.industry,
      requirements: job.requirements,
      benefits: job.benefits,
      salary: toPublicSalary(job),
      createdAt: job.createdAt.toISOString(),
      company: {
        id: job.company.id,
        name: job.company.name,
        website: job.company.website,
      },
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async getPublicJobById(id: string): Promise<PublicJobDetail> {
    const job = await this.prismaClient.job.findFirst({
      where: { id, ...publicJobWhere },
      select: {
        id: true,
        title: true,
        description: true,
        level: true,
        location: true,
        company: { select: { id: true, name: true } },
        stages: {
          orderBy: { position: 'asc' },
          select: {
            id: true,
            name: true,
            description: true,
            position: true,
            format: true,
            estimatedDurationMinutes: true,
          },
        },
        notes: {
          orderBy: { position: 'asc' },
          select: { id: true, content: true, position: true },
        },
        ...salarySelect,
      },
    });
    if (!job) throw new AppError('NOT_FOUND', 'Job not found');
    return {
      id: job.id,
      title: job.title,
      description: job.description,
      level: job.level,
      location: job.location,
      company: { id: job.company.id, name: job.company.name },
      salary: toPublicSalary(job),
      // `format` is free text in the database; only known values reach candidates.
      stages: job.stages.map((stage) => ({
        ...stage,
        format: roundFormatSchema.safeParse(stage.format).success
          ? (stage.format as RoundFormat)
          : null,
      })),
      notes: job.notes,
    };
  }
}
