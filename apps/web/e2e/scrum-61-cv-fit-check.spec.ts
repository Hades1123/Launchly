import { expect, test, type Page } from '@playwright/test';
import { resetAiConsent } from './helpers/db';
import { signIn } from './helpers/auth';

const CANDIDATE = 'candidate1@launchly.test';
/** Seeded, published job (`apps/api/prisma/seed/data.ts`). */
const JOB_TITLE = 'Senior Frontend Engineer';

async function openJob(page: Page) {
  await page.goto(`/jobs?keyword=${encodeURIComponent(JOB_TITLE)}`);
  // Open the job's own page; on wide screens a plain click only selects it in the side panel.
  const href = await page.getByRole('link', { name: new RegExp(JOB_TITLE) }).getAttribute('href');
  await page.goto(href!);
  await expect(page.getByRole('heading', { level: 1, name: JOB_TITLE })).toBeVisible();
}

async function agree(page: Page) {
  await page.getByRole('button', { name: 'I agree' }).click();
  await expect(page.getByRole('button', { name: 'Analyse' })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  resetAiConsent(CANDIDATE);
  await signIn(page, CANDIDATE);
});

test('AC1: no mock data remains on the CV review page', async ({ page }) => {
  await page.goto('/cv-review');

  await expect(page.getByRole('heading', { level: 1, name: 'Check your CV fit' })).toBeVisible();
  await expect(page.getByText('Dữ liệu minh họa')).toHaveCount(0);
  await expect(page.getByText('Nguyen_Minh_Anh')).toHaveCount(0);
});

test('AC2: analysis is blocked until the candidate agrees, and consent persists after reload', async ({
  page,
}) => {
  await page.goto('/cv-review');

  await expect(page.getByRole('region', { name: 'AI consent' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Analyse' })).toHaveCount(0);

  await agree(page);
  await page.reload();

  await expect(page.getByRole('region', { name: 'AI consent' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Analyse' })).toBeVisible();
});

test('AC3: Check my CV fit on the job page opens the review with the job preselected', async ({
  page,
}) => {
  await openJob(page);
  await page.getByRole('link', { name: 'Check my CV fit' }).click();

  await expect(page).toHaveURL(/\/cv-review\?jobId=[0-9a-f-]{36}$/);
  await agree(page);
  await expect(page.getByText(JOB_TITLE)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Change job' })).toBeVisible();
});

test('AC4: a consenting candidate analyses a CV against a job and sees the score', async ({
  page,
}) => {
  await openJob(page);
  await page.getByRole('link', { name: 'Check my CV fit' }).click();
  await agree(page);
  await expect(page.getByRole('button', { name: 'Change job' })).toBeVisible();

  await page.getByRole('button', { name: 'Analyse' }).click();

  await expect(page.getByRole('region', { name: 'Analysis result' })).toBeVisible({
    timeout: 35_000,
  });
  await expect(page.getByRole('img', { name: /Điểm phù hợp \d+ trên 100/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'How to improve' })).toBeVisible();
});

test('AC4: a pasted job description can be analysed too', async ({ page }) => {
  await page.goto('/cv-review');
  await agree(page);

  await page.getByLabel('A pasted job description').check();
  await page
    .getByRole('textbox', { name: 'Job description' })
    .fill('React developer with TypeScript experience.');
  await page.getByRole('button', { name: 'Analyse' }).click();

  await expect(page.getByRole('region', { name: 'Analysis result' })).toBeVisible({
    timeout: 35_000,
  });
});

test('AC6: an API error is shown with its message', async ({ page }) => {
  await page.route('**/api/assessments', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        error: {
          code: 'AI_UNAVAILABLE',
          message: 'The AI could not check your CV. Try again later.',
        },
      }),
    }),
  );
  await page.goto('/cv-review');
  await agree(page);
  await page.getByLabel('A pasted job description').check();
  await page.getByRole('textbox', { name: 'Job description' }).fill('Any job description.');
  await page.getByRole('button', { name: 'Analyse' }).click();

  await expect(
    page.getByRole('alert').filter({ hasText: 'The AI could not check your CV' }),
  ).toBeVisible();
});
