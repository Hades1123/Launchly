import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createCompanySchema } from '@launchly/shared';
import type { PrismaClient } from '@/generated/prisma/client';
import { AppError } from '@/lib/app-error';
import { createAdminCompanyService } from '@/modules/admin/admin-company.service';
import { createCompanyService } from '@/modules/company/company.service';

describe.runIf(process.env.RUN_DB_TESTS === '1')('admin company decisions (integration)', () => {
  let prisma: PrismaClient;
  let ownerId: string;
  let adminId: string;
  let companyId: string;
  const suffix = Date.now().toString(36);

  beforeAll(async () => {
    const { PrismaClient } = await import('@/generated/prisma/client');
    const { PrismaPg } = await import('@prisma/adapter-pg');
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
    });
    ownerId = (
      await prisma.user.create({
        data: { email: `mod-owner-${suffix}@example.com`, role: 'RECRUITER' },
      })
    ).id;
    adminId = (
      await prisma.user.create({
        data: { email: `mod-admin-${suffix}@example.com`, role: 'ADMIN' },
      })
    ).id;
    companyId = (await prisma.company.create({ data: { ownerId, name: `Mod Co ${suffix}` } })).id;
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.company.deleteMany({
      where: { owner: { email: { endsWith: `${suffix}@example.com` } } },
    });
    await prisma.user.deleteMany({ where: { email: { endsWith: `${suffix}@example.com` } } });
    await prisma.$disconnect();
  });

  it('applies exactly one of two concurrent approvals, then the company is public (E1, FR-007)', async () => {
    const service = createAdminCompanyService(prisma, { send: vi.fn(async () => undefined) });

    const results = await Promise.allSettled([
      service.approve(companyId, adminId),
      service.approve(companyId, adminId),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const failed = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(failed.reason).toBeInstanceOf(AppError);
    expect((failed.reason as AppError).code).toBe('CONFLICT');

    const stored = await prisma.company.findUniqueOrThrow({ where: { id: companyId } });
    expect(stored.moderationStatus).toBe('APPROVED');
    expect(stored.reviewedById).toBe(adminId);
    expect(stored.reviewedAt).toBeInstanceOf(Date);

    await expect(createCompanyService(prisma).getPublic(companyId)).resolves.toMatchObject({
      id: companyId,
      moderationReason: null,
    });
  });

  it('creates only one of two concurrent registrations by the same recruiter (FR-016)', async () => {
    const recruiterId = (
      await prisma.user.create({
        data: { email: `mod-racer-${suffix}@example.com`, role: 'RECRUITER' },
      })
    ).id;
    const companies = createCompanyService(prisma);

    const results = await Promise.allSettled([
      companies.create(recruiterId, createCompanySchema.parse({ name: 'Race A', address: 'HCMC' })),
      companies.create(recruiterId, createCompanySchema.parse({ name: 'Race B', address: 'HCMC' })),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(
      ((results.find((r) => r.status === 'rejected') as PromiseRejectedResult).reason as AppError)
        .code,
    ).toBe('CONFLICT');
    await prisma.company.deleteMany({ where: { ownerId: recruiterId } });
  });
});
