import type { AdminCompany, CompanyModerationStatus } from '@launchly/shared';
import type { PrismaClient } from '@/generated/prisma/client';
import { AppError } from '@/lib/app-error';
import type { MailProvider } from '@/providers/mail/mail-provider';

const adminCompanySelect = {
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
  reviewedAt: true,
  createdAt: true,
  owner: { select: { email: true } },
} as const;

type AdminCompanyRow = Omit<AdminCompany, 'ownerEmail' | 'reviewedAt' | 'createdAt'> & {
  reviewedAt: Date | null;
  createdAt: Date;
  owner: { email: string };
};

function toDto({ owner, reviewedAt, createdAt, ...rest }: AdminCompanyRow): AdminCompany {
  return {
    ...rest,
    ownerEmail: owner.email,
    reviewedAt: reviewedAt?.toISOString() ?? null,
    createdAt: createdAt.toISOString(),
  };
}

type Decision = { moderationStatus: 'APPROVED' | 'REJECTED'; moderationReason: string | null };

export function createAdminCompanyService(prisma: PrismaClient, _mail: MailProvider) {
  async function get(id: string): Promise<AdminCompany> {
    const company = await prisma.company.findUnique({ where: { id }, select: adminCompanySelect });
    if (!company) throw new AppError('NOT_FOUND', 'Company not found');
    return toDto(company);
  }

  /** Applies a decision only while the company is still pending, so two admins cannot both decide. */
  async function decide(id: string, reviewerId: string, decision: Decision): Promise<AdminCompany> {
    const { count } = await prisma.company.updateMany({
      where: { id, moderationStatus: 'PENDING' },
      data: { ...decision, reviewedById: reviewerId, reviewedAt: new Date() },
    });
    const company = await get(id);
    if (count === 0) {
      throw new AppError('CONFLICT', `Company is already ${company.moderationStatus}`);
    }
    return company;
  }

  return {
    async list(status: CompanyModerationStatus): Promise<AdminCompany[]> {
      const companies = await prisma.company.findMany({
        where: { moderationStatus: status },
        orderBy: { createdAt: 'asc' },
        select: adminCompanySelect,
      });
      return companies.map(toDto);
    },
    get,
    approve: (id: string, reviewerId: string) =>
      decide(id, reviewerId, { moderationStatus: 'APPROVED', moderationReason: null }),
    reject: (id: string, reviewerId: string, reason: string) =>
      decide(id, reviewerId, { moderationStatus: 'REJECTED', moderationReason: reason }),
  };
}
