/**
 * SCRUM-28 search/filter acceptance tests against the REAL database, driven by the demo seed
 * (`apps/api/prisma/seed/data.ts`). `job.test.ts` mocks Prisma, so it cannot prove that the
 * `where` clause actually selects the right rows; this file does.
 *
 * Setup (one time): the API tests always use the `launchly_test` database (see src/test-setup.ts).
 *   docker exec launchly-postgres createdb -U launchly launchly_test
 *   DATABASE_URL=postgresql://launchly:launchly@localhost:5433/launchly_test \
 *     pnpm --filter @launchly/api exec prisma migrate deploy
 * Run:
 *   RUN_DB_TESTS=1 pnpm --filter @launchly/api test -- src/modules/job/job.search.integration.test.ts
 *
 * Seed jobs relevant to search (company in brackets):
 *   job1 JUNIOR  Remote           Technology  "Senior Frontend Engineer"       [Nimbus Labs, APPROVED]
 *   job2 FRESHER Ho Chi Minh City Technology  "Lập trình viên Backend Node.js" [Nimbus Labs, APPROVED]
 *   job3 INTERN  Ha Noi           Design      "Product Designer", PENDING      [Draft Ventures, PENDING]  (hidden)
 *   job4 INTERN  Ho Chi Minh City Marketing   "Thực tập sinh Marketing"        [FPT Digital, APPROVED]
 *   job5 FRESHER Da Nang          Technology  "Chuyên viên Phân tích Dữ liệu"  [FPT Digital, APPROVED]
 *   job6 FRESHER Ha Noi           Sales       "Draft Sales Associate", DRAFT   [Nimbus Labs, APPROVED]   (hidden)
 * Extra hidden rows created here (not in the seed): CLOSED, REJECTED, and PUBLISHED-at-unapproved-company.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { publicJobListResponseSchema } from '@launchly/shared';
import { createApp } from '@/app';
import { prisma } from '@/lib/prisma';
import { seedData } from '../../../prisma/seed/data';
import { runSeed } from '../../../prisma/seed/run';

const J = {
  job1: '00000000-0000-4000-8000-000000000401',
  job2: '00000000-0000-4000-8000-000000000402',
  job3: '00000000-0000-4000-8000-000000000403',
  job4: '00000000-0000-4000-8000-000000000404',
  job5: '00000000-0000-4000-8000-000000000405',
  job6: '00000000-0000-4000-8000-000000000406',
  closed: '00000000-0000-4000-8000-0000000004f1',
  rejected: '00000000-0000-4000-8000-0000000004f2',
  publishedAtPendingCompany: '00000000-0000-4000-8000-0000000004f3',
};
const PUBLIC = [J.job1, J.job2, J.job4, J.job5];
const EXTRA_HIDDEN = [J.closed, J.rejected, J.publishedAtPendingCompany];

const app = createApp();

async function search(query: Record<string, string | number> = {}) {
  const res = await request(app).get('/jobs').query(query); // no auth header: guest access
  return res;
}

async function ids(query: Record<string, string | number> = {}): Promise<string[]> {
  const res = await search(query);
  expect(res.status).toBe(200);
  return (res.body.data as Array<{ id: string }>).map((j) => j.id).sort();
}

const sorted = (...list: string[]) => [...list].sort();

describe.runIf(process.env.RUN_DB_TESTS === '1')('GET /jobs search and filter (seed data)', () => {
  beforeAll(async () => {
    // Guard: never seed or delete rows in a non-test database.
    expect(process.env.DATABASE_URL).toContain('launchly_test');
    await runSeed(prisma);

    const approved = seedData.jobs.find((j) => j.id === J.job1)!;
    const pending = seedData.jobs.find((j) => j.id === J.job3)!;
    const base = {
      createdById: approved.createdById,
      description: 'Must never be visible in public search.',
      level: 'FRESHER' as const,
      location: 'Ho Chi Minh City',
      industry: 'Technology',
      requirements: [],
      benefits: [],
    };
    await prisma.job.createMany({
      skipDuplicates: true,
      data: [
        {
          ...base,
          id: J.closed,
          companyId: approved.companyId,
          title: 'Hidden Closed Role',
          titleNormalized: 'hidden closed role',
          publicationStatus: 'CLOSED',
        },
        {
          ...base,
          id: J.rejected,
          companyId: approved.companyId,
          title: 'Hidden Rejected Role',
          titleNormalized: 'hidden rejected role',
          publicationStatus: 'REJECTED',
        },
        {
          ...base,
          id: J.publishedAtPendingCompany,
          companyId: pending.companyId,
          title: 'Hidden Published Role',
          titleNormalized: 'hidden published role',
          publicationStatus: 'PUBLISHED',
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.job.deleteMany({ where: { id: { in: EXTRA_HIDDEN } } });
    await prisma.$disconnect();
  });

  describe('public listing rule (AC: Draft, Pending, Rejected, Closed never appear)', () => {
    it('lists exactly the published jobs of approved companies', async () => {
      const res = await search();
      expect(res.status).toBe(200);
      expect(publicJobListResponseSchema.parse(res.body).pagination).toEqual({
        page: 1,
        limit: 10,
        total: PUBLIC.length,
        totalPages: 1,
      });
      expect(await ids()).toEqual(sorted(...PUBLIC));
    });

    it.each([
      ['draft job (job6)', { keyword: 'Draft Sales' }],
      ['pending job at pending company (job3)', { keyword: 'Product Designer' }],
      ['pending company name (Draft Ventures)', { keyword: 'Draft Ventures' }],
      ['closed job', { keyword: 'Hidden Closed' }],
      ['rejected job', { keyword: 'Hidden Rejected' }],
      ['published job at unapproved company', { keyword: 'Hidden Published' }],
      ['industry only hidden jobs have: Sales', { industry: 'Sales' }],
      ['industry only hidden jobs have: Design', { industry: 'Design' }],
      ['location only hidden jobs have: Ha Noi', { location: 'Ha Noi' }],
    ])('never returns a non-public job: %s', async (_name, query) => {
      expect(await ids(query)).toEqual([]);
    });

    it('never returns a non-public job even for the broadest query', async () => {
      const all = await ids({ limit: 50 });
      for (const hidden of [J.job3, J.job6, ...EXTRA_HIDDEN]) expect(all).not.toContain(hidden);
    });
  });

  describe('level filter', () => {
    it.each([
      ['INTERN', [J.job4]], // job3 is also INTERN but hidden
      ['FRESHER', [J.job2, J.job5]], // job6 is also FRESHER but a draft
      ['JUNIOR', [J.job1]],
    ])('level=%s', async (level, expected) => {
      expect(await ids({ level })).toEqual(sorted(...expected));
    });

    it('rejects a level outside the enum with 400', async () => {
      const res = await search({ level: 'SENIOR' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('industry filter', () => {
    it.each([
      ['Technology', [J.job1, J.job2, J.job5]],
      ['technology', [J.job1, J.job2, J.job5]], // case-insensitive
      ['TECHNOLOGY', [J.job1, J.job2, J.job5]],
      ['Marketing', [J.job4]],
      ['Tech', []], // exact category match, not substring
      ['Finance', []],
    ])('industry=%s', async (industry, expected) => {
      expect(await ids({ industry })).toEqual(sorted(...expected));
    });
  });

  describe('location filter', () => {
    it.each([
      ['Ho Chi Minh City', [J.job2, J.job4]],
      ['ho chi minh', [J.job2, J.job4]], // case-insensitive substring
      ['Remote', [J.job1]],
      ['Da Nang', [J.job5]],
      ['Can Tho', []],
    ])('location=%s', async (location, expected) => {
      expect(await ids({ location })).toEqual(sorted(...expected));
    });
  });

  describe('combined filters (AC: results satisfy all selected conditions)', () => {
    it.each([
      ['industry + level', { industry: 'Technology', level: 'FRESHER' }, [J.job2, J.job5]],
      [
        'industry + level + location',
        { industry: 'Technology', level: 'FRESHER', location: 'Da Nang' },
        [J.job5],
      ],
      ['level + location', { level: 'INTERN', location: 'Ho Chi Minh City' }, [J.job4]],
      ['industry + level, no overlap', { industry: 'Technology', level: 'INTERN' }, []],
      ['level + location, no overlap', { level: 'JUNIOR', location: 'Da Nang' }, []],
    ])('%s', async (_name, query, expected) => {
      expect(await ids(query)).toEqual(sorted(...expected));
    });
  });

  describe('keyword search on job title or company name', () => {
    it.each([
      ['frontend', [J.job1]],
      ['SENIOR FRONTEND', [J.job1]], // case-insensitive
      ['marketing', [J.job4]],
      ['node.js', [J.job2]],
    ])('title keyword "%s"', async (keyword, expected) => {
      expect(await ids({ keyword })).toEqual(sorted(...expected));
    });

    it.each([
      ['nimbus', [J.job1, J.job2]],
      ['Nimbus Labs', [J.job1, J.job2]],
      ['fpt', [J.job4, J.job5]],
      ['FPT DIGITAL', [J.job4, J.job5]],
    ])('company keyword "%s"', async (keyword, expected) => {
      expect(await ids({ keyword })).toEqual(sorted(...expected));
    });

    it.each([
      ['lap trinh', [J.job2]], // unaccented query matches "Lập trình"
      ['Lập trình', [J.job2]], // accented query matches itself
      ['LAP TRINH VIEN', [J.job2]],
      ['thuc tap', [J.job4]],
      ['Thực tập sinh', [J.job4]],
      ['phan tich du lieu', [J.job5]],
      ['Phân tích Dữ liệu', [J.job5]],
      ['du lieu', [J.job5]],
    ])('accent-tolerant Vietnamese keyword "%s"', async (keyword, expected) => {
      expect(await ids({ keyword })).toEqual(sorted(...expected));
    });

    it('treats a whitespace-only keyword as no keyword', async () => {
      expect(await ids({ keyword: '   ' })).toEqual(sorted(...PUBLIC));
    });

    it.each([
      ['keyword + level', { keyword: 'nimbus', level: 'FRESHER' }, [J.job2]],
      ['keyword + industry', { keyword: 'fpt', industry: 'Technology' }, [J.job5]],
      ['keyword + location', { keyword: 'fpt', location: 'Ho Chi Minh City' }, [J.job4]],
      ['keyword + filters, no overlap', { keyword: 'nimbus', industry: 'Marketing' }, []],
    ])('keyword combined with filters: %s', async (_name, query, expected) => {
      expect(await ids(query)).toEqual(sorted(...expected));
    });
  });

  describe('empty state', () => {
    it('returns an empty page, not an error, when nothing matches', async () => {
      const res = await search({ keyword: 'zzz-no-such-job' });
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.pagination).toEqual({ page: 1, limit: 10, total: 0, totalPages: 0 });
    });
  });

  describe('pagination keeps filters applied', () => {
    it('splits all public jobs across pages without gaps or duplicates', async () => {
      const p1 = await search({ limit: 2, page: 1 });
      const p2 = await search({ limit: 2, page: 2 });
      const p3 = await search({ limit: 2, page: 3 });
      expect(p1.body.pagination).toEqual({ page: 1, limit: 2, total: 4, totalPages: 2 });
      expect(p1.body.data).toHaveLength(2);
      expect(p2.body.data).toHaveLength(2);
      expect(p3.body.data).toEqual([]);
      const combined = [...p1.body.data, ...p2.body.data].map((j: { id: string }) => j.id).sort();
      expect(combined).toEqual(sorted(...PUBLIC));
    });

    it('applies the filter on every page (industry=Technology, limit=2)', async () => {
      const p1 = await search({ industry: 'Technology', limit: 2, page: 1 });
      const p2 = await search({ industry: 'Technology', limit: 2, page: 2 });
      expect(p1.body.pagination).toEqual({ page: 1, limit: 2, total: 3, totalPages: 2 });
      expect(p1.body.data).toHaveLength(2);
      expect(p2.body.data).toHaveLength(1);
      const combined = [...p1.body.data, ...p2.body.data].map((j: { id: string }) => j.id).sort();
      expect(combined).toEqual(sorted(J.job1, J.job2, J.job5));
    });

    it.each([
      ['limit above 50', { limit: 51 }],
      ['limit 0', { limit: 0 }],
      ['page 0', { page: 0 }],
      ['non-numeric page', { page: 'abc' }],
    ])('rejects invalid paging: %s', async (_name, query) => {
      expect((await search(query)).status).toBe(400);
    });
  });

  describe('result card and public DTO', () => {
    it('returns position, company, location, level and no internal fields', async () => {
      const res = await search({ keyword: 'lap trinh' });
      const [item] = res.body.data;
      expect(item).toMatchObject({
        id: J.job2,
        title: 'Lập trình viên Backend Node.js',
        level: 'FRESHER',
        location: 'Ho Chi Minh City',
        industry: 'Technology',
        salaryMin: 500,
        salaryMax: 1000,
        company: { name: 'Nimbus Labs' },
      });
      for (const key of [
        'description',
        'publicationStatus',
        'createdById',
        'titleNormalized',
        'moderationReason',
      ]) {
        expect(item).not.toHaveProperty(key);
      }
    });

    it('works for guests on the /api/jobs alias used by the web rewrite', async () => {
      const res = await request(app).get('/api/jobs').query({ level: 'JUNIOR' });
      expect(res.status).toBe(200);
      expect(res.body.data.map((j: { id: string }) => j.id)).toEqual([J.job1]);
    });
  });
});
