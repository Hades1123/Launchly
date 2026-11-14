#!/usr/bin/env node
// Changed-file coverage gate (constitution Principle IV): every source file changed against the
// base ref must reach MIN_PCT lines and branches. Reads the `coverage-summary.json` that
// `pnpm test:coverage` writes in each package. Usage: `pnpm test:coverage && pnpm coverage:changed`.
// Base ref: $COVERAGE_BASE, else origin/main. Packages without a coverage report (apps/web, which
// is covered by Playwright e2e) are listed as skipped, never as passed.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const MIN_PCT = 80;
const PACKAGES = ['apps/api', 'apps/web', 'packages/shared'];

/** A changed file the gate applies to: `<package>/src/**` source, no tests, types or generated code. */
export function isGatedSource(file) {
  return (
    PACKAGES.some((pkg) => file.startsWith(`${pkg}/src/`)) &&
    /\.(ts|tsx)$/.test(file) &&
    !/\.d\.ts$/.test(file) &&
    !/\.(test|spec)\.(ts|tsx)$/.test(file) &&
    !file.includes('/generated/') &&
    !file.includes('/__fixtures__/')
  );
}

const pct = (metric) => (metric.total === 0 ? 100 : (metric.covered / metric.total) * 100);

/**
 * @param {string[]} changed repo-relative changed files
 * @param {(pkg: string) => Record<string, any> | null} loadSummary coverage-summary.json of a package, or null
 * @param {string} root absolute repo root
 */
export function evaluate(changed, loadSummary, root) {
  const results = [];
  const summaries = new Map();
  for (const file of changed.filter(isGatedSource)) {
    const pkg = PACKAGES.find((p) => file.startsWith(`${p}/`));
    if (!summaries.has(pkg)) summaries.set(pkg, loadSummary(pkg));
    const summary = summaries.get(pkg);
    if (!summary) {
      results.push({ file, status: 'skipped', note: `no coverage report for ${pkg}` });
      continue;
    }
    const entry = summary[path.join(root, file)];
    if (!entry) {
      results.push({ file, status: 'skipped', note: 'excluded from the coverage config' });
      continue;
    }
    const lines = pct(entry.lines);
    const branches = pct(entry.branches);
    results.push({
      file,
      status: lines >= MIN_PCT && branches >= MIN_PCT ? 'pass' : 'fail',
      lines,
      branches,
    });
  }
  return results;
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function main() {
  const root = git(['rev-parse', '--show-toplevel']);
  const base = process.env.COVERAGE_BASE ?? 'origin/main';
  const mergeBase = git(['merge-base', base, 'HEAD']);
  // Committed changes since the merge base plus staged, unstaged and untracked work.
  const changed = new Set(git(['diff', '--name-only', '--diff-filter=d', mergeBase]).split('\n'));
  for (const f of git(['ls-files', '--others', '--exclude-standard']).split('\n')) changed.add(f);

  const loadSummary = (pkg) => {
    const file = path.join(root, pkg, 'coverage', 'coverage-summary.json');
    return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
  };
  const results = evaluate([...changed].filter(Boolean), loadSummary, root);

  if (results.length === 0)
    console.log(`coverage:changed: no gated source files changed vs ${base}.`);
  for (const r of results) {
    if (r.status === 'skipped') console.log(`SKIP  ${r.file} (${r.note})`);
    else
      console.log(
        `${r.status === 'pass' ? 'PASS' : 'FAIL'}  ${r.file}  lines ${r.lines.toFixed(1)}%  branches ${r.branches.toFixed(1)}%`,
      );
  }
  const failed = results.filter((r) => r.status === 'fail');
  if (failed.length > 0) {
    console.error(
      `coverage:changed: ${failed.length} file(s) below ${MIN_PCT}% lines or branches.`,
    );
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
