/**
 * SCRUM-82: the `job_level_junior` migration remaps SENIOR to JUNIOR and recreates the enum.
 * The SQL runs inside a rolled-back transaction in a scratch schema that holds the old enum and a
 * minimal `Job` table, so no real data is touched.
 *
 * Run: RUN_DB_TESTS=1 pnpm --filter @launchly/api exec vitest run prisma/job-level-migration.integration.test.ts
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

const MIGRATION_SQL = readFileSync(
  fileURLToPath(
    new URL('./migrations/20261113110000_job_level_junior/migration.sql', import.meta.url),
  ),
  'utf8',
);

/** The state before the migration: the old enum, a nullable level column and its index. */
const OLD_STATE = [
  `CREATE TYPE "JobLevel" AS ENUM ('INTERN', 'FRESHER', 'SENIOR')`,
  `CREATE TABLE "Job" ("id" TEXT PRIMARY KEY, "level" "JobLevel")`,
  `CREATE INDEX "Job_level_idx" ON "Job"("level")`,
];

function statements(sql: string): string[] {
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

class Rollback extends Error {}

describe.runIf(process.env.RUN_DB_TESTS === '1')('job_level_junior migration (integration)', () => {
  let prisma: Awaited<ReturnType<typeof makeClient>>;

  async function makeClient() {
    const { PrismaClient } = await import('@/generated/prisma/client');
    const { PrismaPg } = await import('@prisma/adapter-pg');
    return new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
    });
  }

  type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

  /** Builds the old state, applies the migration, runs `check`, then rolls everything back. */
  async function applyMigration(
    rows: Array<[string, string | null]>,
    check: (tx: Tx) => Promise<void>,
  ) {
    prisma ??= await makeClient();
    // Guard: only ever touch the test database.
    expect(process.env.DATABASE_URL).toContain('launchly_test');
    await prisma
      .$transaction(async (tx) => {
        await tx.$executeRawUnsafe('CREATE SCHEMA "mig_job_level"');
        await tx.$executeRawUnsafe('SET LOCAL search_path TO "mig_job_level"');
        for (const sql of OLD_STATE) await tx.$executeRawUnsafe(sql);
        for (const [id, level] of rows) {
          await tx.$executeRawUnsafe(
            `INSERT INTO "Job" ("id", "level") VALUES ($1, $2::"JobLevel")`,
            id,
            level,
          );
        }
        for (const sql of statements(MIGRATION_SQL)) await tx.$executeRawUnsafe(sql);
        await check(tx);
        throw new Rollback();
      })
      .catch((error: unknown) => {
        if (!(error instanceof Rollback)) throw error;
      });
  }

  async function enumLabels(tx: Tx): Promise<string | undefined> {
    const [row] = await tx.$queryRawUnsafe<Array<{ labels: string }>>(
      `SELECT enum_range(NULL::"JobLevel")::text AS "labels"`,
    );
    return row?.labels;
  }

  afterAll(async () => {
    if (prisma) await prisma.$disconnect();
  });

  it('remaps SENIOR rows to JUNIOR, keeps the others and recreates the enum without SENIOR', async () => {
    await applyMigration(
      [
        ['a', 'SENIOR'],
        ['b', 'INTERN'],
        ['c', 'FRESHER'],
        ['d', null],
      ],
      async (tx) => {
        const rows = await tx.$queryRawUnsafe<Array<{ id: string; level: string | null }>>(
          `SELECT "id", "level"::text AS "level" FROM "Job" ORDER BY "id"`,
        );
        expect(rows).toEqual([
          { id: 'a', level: 'JUNIOR' },
          { id: 'b', level: 'INTERN' },
          { id: 'c', level: 'FRESHER' },
          { id: 'd', level: null },
        ]);
        expect(await enumLabels(tx)).toBe('{INTERN,FRESHER,JUNIOR}');
        await expect(
          tx.$executeRawUnsafe(`INSERT INTO "Job" ("id", "level") VALUES ('x', 'SENIOR')`),
        ).rejects.toThrow();
      },
    );
  });

  it('applies on an empty table (fresh database) and keeps the level index', async () => {
    await applyMigration([], async (tx) => {
      expect(await enumLabels(tx)).toBe('{INTERN,FRESHER,JUNIOR}');
      const index = await tx.$queryRawUnsafe<Array<{ indexname: string }>>(
        `SELECT indexname FROM pg_indexes WHERE schemaname = 'mig_job_level' AND indexname = 'Job_level_idx'`,
      );
      expect(index).toHaveLength(1);
    });
  });
});
