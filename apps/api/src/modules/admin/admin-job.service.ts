import type { AdminJob, AdminJobListQuery } from '@launchly/shared';
import type { Prisma, PrismaClient } from '@/generated/prisma/client';
import { AppError } from '@/lib/app-error';
import { recruiterJobSelect, toRecruiterJobDto } from '@/modules/job/recruiter-job.service';
import type { MailProvider } from '@/providers/mail/mail-provider';
import { createModerationEmail } from '@/providers/mail/moderation-email-templates';

/** The recruiter's view of a job plus what an admin needs: company, creator and review time. */
const adminJobSelect = {
  ...recruiterJobSelect,
  reviewedAt: true,
  company: { select: { name: true } },
  createdBy: { select: { email: true } },
} as const satisfies Prisma.JobSelect;

type AdminJobRow = Prisma.JobGetPayload<{ select: typeof adminJobSelect }>;

function toDto({ reviewedAt, company, createdBy, ...job }: AdminJobRow): AdminJob {
  return {
    ...toRecruiterJobDto(job),
    companyName: company.name,
    creatorEmail: createdBy.email,
    reviewedAt: reviewedAt?.toISOString() ?? null,
  };
}

type Decision = { publicationStatus: 'PUBLISHED' | 'REJECTED'; moderationReason: string | null };

export function createAdminJobService(prisma: PrismaClient, mail: MailProvider) {
  async function get(id: string): Promise<AdminJob> {
    const job = await prisma.job.findUnique({ where: { id }, select: adminJobSelect });
    if (!job) throw new AppError('NOT_FOUND', 'Job not found');
    return toDto(job);
  }

  /** Emails the job's creator without holding up the response; a failure is only logged. */
  function notifyCreator(job: AdminJob) {
    const names = { jobTitle: job.title, companyName: job.companyName };
    const email =
      job.status === 'PUBLISHED'
        ? createModerationEmail({ kind: 'job-published', ...names })
        : createModerationEmail({
            kind: 'job-rejected',
            ...names,
            reason: job.moderationReason ?? '',
          });
    // A fixed message only: mail errors carry the recipient and the server response.
    void mail.send({ to: job.creatorEmail, ...email }).catch(() => {
      console.error('Job moderation email failed');
    });
  }

  /**
   * Applies a decision in one conditional update, so it only lands while the job is still pending
   * and two admins cannot both decide (E1).
   */
  async function decide(id: string, reviewerId: string, decision: Decision): Promise<AdminJob> {
    let job: AdminJob;
    try {
      const row = await prisma.job.update({
        where: { id, publicationStatus: 'PENDING' },
        data: { ...decision, reviewedById: reviewerId, reviewedAt: new Date() },
        select: adminJobSelect,
      });
      job = toDto(row);
    } catch (error) {
      if ((error as { code?: string } | null)?.code !== 'P2025') throw error;
      const current = await prisma.job.findUnique({
        where: { id },
        select: { publicationStatus: true },
      });
      if (!current) throw new AppError('NOT_FOUND', 'Job not found');
      throw new AppError('CONFLICT', `Job is already ${current.publicationStatus}`);
    }
    notifyCreator(job);
    return job;
  }

  return {
    async list(status: AdminJobListQuery['status']): Promise<AdminJob[]> {
      const jobs = await prisma.job.findMany({
        where: { publicationStatus: status },
        orderBy: { updatedAt: 'asc' },
        select: adminJobSelect,
      });
      return jobs.map(toDto);
    },
    get,
    approve: (id: string, reviewerId: string) =>
      decide(id, reviewerId, { publicationStatus: 'PUBLISHED', moderationReason: null }),
    reject: (id: string, reviewerId: string, reason: string) =>
      decide(id, reviewerId, { publicationStatus: 'REJECTED', moderationReason: reason }),
  };
}
