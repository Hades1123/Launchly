import { expect, test, type Page } from '@playwright/test';

/** Seeded, published job of an approved company (`apps/api/prisma/seed/data.ts`). */
const JOB_TITLE = 'Senior Frontend Engineer';

/** Searches for the seeded job and opens it from its card. */
async function openJobFromSearch(page: Page, title = JOB_TITLE) {
  await page.goto(`/jobs?keyword=${encodeURIComponent(title)}`);
  await page.getByRole('link', { name: new RegExp(title) }).click();
}

test('AC1: clicking a job card opens its detail page', async ({ page }) => {
  await openJobFromSearch(page);

  await expect(page).toHaveURL(/\/jobs\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { level: 1, name: JOB_TITLE })).toBeVisible();
});

test('AC2: the detail page shows the job fields and hiring process', async ({ page }) => {
  await openJobFromSearch(page);

  await expect(page.getByRole('heading', { level: 1, name: JOB_TITLE })).toBeVisible();
  await expect(page.getByRole('link', { name: /Nimbus Labs/ }).first()).toHaveAttribute(
    'href',
    /\/companies\/[0-9a-f-]{36}$/,
  );
  await expect(page.getByRole('heading', { name: 'Requirements' })).toBeVisible();
  await expect(page.getByText('TypeScript')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Benefits' })).toBeVisible();
  await expect(page.getByText('Remote-first')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Hiring process' })).toBeVisible();
  await expect(page.getByText('Own the candidate-facing web app.')).toBeVisible();
  await expect(page.getByText('Senior', { exact: true })).toBeVisible();
  await expect(page.getByText('Remote', { exact: true })).toBeVisible();
  await expect(page.getByText('$2000 - $4000')).toBeVisible();
});

test('AC2: a hidden salary shows as negotiable, never the stored range', async ({ page }) => {
  await openJobFromSearch(page, 'Thực tập sinh Frontend React');

  await expect(page.getByText('Negotiable')).toBeVisible();
  await expect(page.getByText(/\$300/)).toHaveCount(0);
});

test('AC2: empty requirements and benefits sections are hidden', async ({ page }) => {
  await openJobFromSearch(page, 'Customer Support Intern');

  await expect(
    page.getByRole('heading', { level: 1, name: 'Customer Support Intern' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Requirements' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Benefits' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Hiring process' })).toBeVisible();
});

test('AC3: an unknown job id shows the not-found page', async ({ page }) => {
  const res = await page.goto('/jobs/00000000-0000-4000-8000-0000000000ff');

  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Job not found' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to all jobs' })).toBeVisible();
});

test('AC4: the detail page fits a phone width without horizontal scroll', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await openJobFromSearch(page);
  await expect(page.getByRole('heading', { level: 1, name: JOB_TITLE })).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
