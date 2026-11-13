import { expect, test, type Page } from '@playwright/test';
import { signIn, waitForSession } from './helpers/auth';
import { resetApplication } from './helpers/db';

const CANDIDATE = 'candidate1@launchly.test';
/** Published job the seeded candidate has not applied to (`apps/api/prisma/seed/data.ts`). */
const OPEN_JOB = 'Lập trình viên Backend Node.js';
/** Seeded application of the same candidate: `Senior Frontend Engineer` is already applied. */
const APPLIED_JOB = 'Senior Frontend Engineer';

async function openJob(page: Page, title: string) {
  await page.goto(`/jobs?keyword=${encodeURIComponent(title)}`);
  await waitForSession(page);
  // Open the job's own page; on wide screens a plain click only selects it in the side panel.
  const href = await page.getByRole('link', { name: new RegExp(title) }).getAttribute('href');
  await page.goto(href!);
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
}

test.beforeEach(() => {
  resetApplication(CANDIDATE, OPEN_JOB);
});

test('AC1: a candidate with a CV applies in two steps and the button becomes Applied', async ({
  page,
}) => {
  await signIn(page, CANDIDATE);
  await openJob(page, OPEN_JOB);

  // Step 1: open the dialog. The newest CV is already selected.
  await page.getByRole('button', { name: 'Apply' }).click();
  const dialog = page.getByRole('dialog', { name: /Apply to/ });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Your CV')).not.toHaveValue('');
  await dialog.getByLabel('Cover letter (optional)').fill('I would love to join the team.');

  // Step 2: submit.
  await dialog.getByRole('button', { name: 'Submit application' }).click();

  await expect(page.getByRole('button', { name: 'Applied' })).toBeDisabled();
  await expect(page.getByRole('status')).toContainText('Application sent');
  await expect(page.getByRole('link', { name: 'View my applications' })).toHaveAttribute(
    'href',
    '/applications',
  );
});

test('AC1: the cover letter counter stops at 2000 characters', async ({ page }) => {
  await signIn(page, CANDIDATE);
  await openJob(page, OPEN_JOB);
  await page.getByRole('button', { name: 'Apply' }).click();

  const letter = page.getByLabel('Cover letter (optional)');
  await letter.fill('x'.repeat(2005));

  await expect(letter).toHaveValue('x'.repeat(2000));
  await expect(page.getByText('2000 / 2000')).toBeVisible();
});

test('AC2: an anonymous visitor is sent to login and returns to the job', async ({ page }) => {
  await openJob(page, OPEN_JOB);
  const jobUrl = page.url();

  await page.getByRole('link', { name: 'Apply' }).click();
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.getByLabel('Email').fill(CANDIDATE);
  await page.getByLabel('Mật khẩu', { exact: true }).fill('Launchly@123');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();

  await expect(page).toHaveURL(jobUrl);
  await expect(page.getByRole('button', { name: 'Apply' })).toBeVisible();
});

test('AC2: a recruiter does not see the Apply button', async ({ page }) => {
  await signIn(page, 'recruiter@launchly.test');
  await openJob(page, OPEN_JOB);

  await expect(page.getByRole('link', { name: 'Check my CV fit' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Apply/ })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Apply' })).toHaveCount(0);
});

test('AC2: a candidate without a CV sees a link to the profile', async ({ page }) => {
  await signIn(page, CANDIDATE);
  await page.route('**/api/candidates/profile', async (route) => {
    const response = await route.fetch();
    const profile = await response.json();
    await route.fulfill({ response, json: { ...profile, resumes: [] } });
  });
  await openJob(page, OPEN_JOB);

  await expect(page.getByRole('link', { name: 'Upload a CV in your profile' })).toHaveAttribute(
    'href',
    '/profile',
  );
  await expect(page.getByRole('button', { name: 'Apply' })).toBeDisabled();
});

test('AC2: an already applied job shows a disabled Applied button', async ({ page }) => {
  await signIn(page, CANDIDATE);
  await openJob(page, APPLIED_JOB);

  await expect(page.getByRole('button', { name: 'Applied' })).toBeDisabled();
});

test('AC2: a 409 duplicate and a 404 closed job show readable messages', async ({ page }) => {
  await signIn(page, CANDIDATE);
  await openJob(page, OPEN_JOB);
  let reply = { status: 409, code: 'CONFLICT', message: 'Already applied' };
  await page.route('**/api/applications', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({
          status: reply.status,
          contentType: 'application/json',
          body: JSON.stringify({ error: { code: reply.code, message: reply.message } }),
        })
      : route.continue(),
  );
  await page.getByRole('button', { name: 'Apply' }).click();
  const dialog = page.getByRole('dialog', { name: /Apply to/ });

  await dialog.getByRole('button', { name: 'Submit application' }).click();
  await expect(dialog.getByRole('alert')).toContainText('You have already applied to this job');

  reply = { status: 404, code: 'NOT_FOUND', message: 'Job not found' };
  await dialog.getByRole('button', { name: 'Submit application' }).click();
  await expect(dialog.getByRole('alert')).toContainText('This job is no longer open');
});

test('AC3: the apply dialog fits a phone width without horizontal scroll', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await signIn(page, CANDIDATE);
  await openJob(page, OPEN_JOB);
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByRole('dialog', { name: /Apply to/ })).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
