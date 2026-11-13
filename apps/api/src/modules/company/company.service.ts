import type { PrismaClient } from '@/generated/prisma/client';
import type { CompanyDto, CreateCompanyInput } from '@launchly/shared';
import { AppError } from '@/lib/app-error';

const companySelect = {
  id: true,
  name: true,
  address: true,
  industry: true,
  companySize: true,
  website: true,
  logoUrl: true,
  description: true,
  moderationStatus: true,
  moderationReason: true,
  createdAt: true,
} as const;

type CompanyRow = {
  id: string;
  name: string;
  address: string | null;
  industry: string | null;
  companySize: string | null;
  website: string | null;
  logoUrl: string | null;
  description: string | null;
  moderationStatus: CompanyDto['moderationStatus'];
  moderationReason: string | null;
  createdAt: Date;
};

function toDto(row: CompanyRow): CompanyDto {
  return { ...row, createdAt: row.createdAt.toISOString() };
}

export function createCompanyService(prisma: PrismaClient) {
  return {
    async create(ownerId: string, input: CreateCompanyInput): Promise<CompanyDto> {
      // A rejected company stays on record; only a pending or approved one blocks a new registration.
      const existing = await prisma.company.findFirst({
        where: { ownerId, moderationStatus: { in: ['PENDING', 'APPROVED'] } },
        select: { id: true },
      });
      if (existing) {
        throw new AppError('CONFLICT', 'You already have a pending or approved company');
      }
      const company = await prisma.company.create({
        data: { ownerId, ...input },
        select: companySelect,
      });
      return toDto(company);
    },

    async getMine(ownerId: string): Promise<CompanyDto> {
      const company = await prisma.company.findFirst({
        where: { ownerId },
        orderBy: { createdAt: 'desc' },
        select: companySelect,
      });
      if (!company) throw new AppError('NOT_FOUND', 'Company profile not found');
      return toDto(company);
    },

    async getPublic(id: string): Promise<CompanyDto> {
      const company = await prisma.company.findFirst({
        where: { id, moderationStatus: 'APPROVED' },
        select: companySelect,
      });
      if (!company) throw new AppError('NOT_FOUND', 'Company not found');
      return toDto(company);
    },
  };
}
