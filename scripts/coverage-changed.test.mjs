import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluate, isGatedSource } from './coverage-changed.mjs';

const root = '/repo';
const entry = (lines, branches) => ({
  lines: { total: 10, covered: lines },
  branches: { total: branches === null ? 0 : 10, covered: branches ?? 0 },
});

test('isGatedSource keeps source and drops tests, types and generated code', () => {
  assert.equal(isGatedSource('apps/api/src/modules/job/job.service.ts'), true);
  assert.equal(isGatedSource('apps/web/src/components/x.tsx'), true);
  assert.equal(isGatedSource('apps/api/src/modules/job/job.service.test.ts'), false);
  assert.equal(isGatedSource('apps/api/src/generated/prisma/client.ts'), false);
  assert.equal(isGatedSource('apps/api/src/types.d.ts'), false);
  assert.equal(isGatedSource('apps/api/prisma/seed/run.ts'), false);
  assert.equal(isGatedSource('docs/readme.md'), false);
});

test('passes at exactly 80 % and fails below it on either metric', () => {
  const summary = {
    '/repo/packages/shared/src/a.ts': entry(8, 8),
    '/repo/packages/shared/src/b.ts': entry(10, 7),
    '/repo/packages/shared/src/c.ts': entry(7, 10),
  };
  const out = evaluate(
    ['packages/shared/src/a.ts', 'packages/shared/src/b.ts', 'packages/shared/src/c.ts'],
    () => summary,
    root,
  );
  assert.deepEqual(
    out.map((r) => r.status),
    ['pass', 'fail', 'fail'],
  );
});

test('a file with no branches passes on branches', () => {
  const out = evaluate(
    ['packages/shared/src/a.ts'],
    () => ({ '/repo/packages/shared/src/a.ts': entry(10, null) }),
    root,
  );
  assert.equal(out[0].status, 'pass');
});

test('skips packages without a report and files excluded by config', () => {
  const out = evaluate(
    ['apps/web/src/a.tsx', 'apps/api/src/server.ts'],
    (pkg) => (pkg === 'apps/api' ? {} : null),
    root,
  );
  assert.deepEqual(
    out.map((r) => r.status),
    ['skipped', 'skipped'],
  );
});

test('ignores non-gated files', () => {
  assert.deepEqual(
    evaluate(['README.md', 'apps/api/src/x.test.ts'], () => null, root),
    [],
  );
});
