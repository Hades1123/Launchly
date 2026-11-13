import type { AdminCompany, CompanyModerationStatus } from '@launchly/shared';
import type { PrismaClient } from '@/generated/prisma/client';
import { AppError } from '@/lib/app-error';
import type { MailProvider } from '@/providers/mail/mail-provider';
import { createModerationEmail } from '@/providers/mail/moderation-email-templates';

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

export function createAdminCompanyService(prisma: PrismaClient, mail: MailProvider) {
  async function get(id: string): Promise<AdminCompany> {
    const company = await prisma.company.findUnique({ where: { id }, select: adminCompanySelect });
    if (!company) throw new AppError('NOT_FOUND', 'Company not found');
    return toDto(company);
  }

  /** Emails the owner without holding up the response; a failure is only logged (FR-009). */
  function notifyOwner(company: AdminCompany) {
    const email =
      company.moderationStatus === 'APPROVED'
        ? createModerationEmail({ kind: 'company-approved', companyName: company.name })
        : createModerationEmail({
            kind: 'company-rejected',
            companyName: company.name,
            reason: company.moderationReason ?? '',
          });
    void mail.send({ to: company.ownerEmail, ...email }).catch((error: unknown) => {
      console.error('Company moderation email failed', error);
    });
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
    notifyOwner(company);
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
