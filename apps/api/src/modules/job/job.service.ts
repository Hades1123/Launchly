import type { PrismaClient, Prisma } from '@/generated/prisma/client';
import { prisma as defaultPrisma } from '@/lib/prisma';
import type { JobFilterQuery, PublicJobListResponse, PublicJobItem } from '@launchly/shared';
import { normalizeVietnamese } from '@launchly/shared';

export class JobService {
  constructor(private readonly prismaClient: PrismaClient = defaultPrisma) {}

  async searchJobs(query: JobFilterQuery): Promise<PublicJobListResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    // Build Prisma where clause enforcing the public listing rule:
    // Only jobs that are PUBLISHED and belong to an APPROVED company are returned.
    const andConditions: Prisma.JobWhereInput[] = [
      { publicationStatus: 'PUBLISHED' },
      { company: { moderationStatus: 'APPROVED' } },
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
      salaryMin: job.salaryMin !== null ? Number(job.salaryMin) : null,
      salaryMax: job.salaryMax !== null ? Number(job.salaryMax) : null,
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
}
