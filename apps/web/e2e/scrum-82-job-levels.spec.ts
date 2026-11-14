import { expect, test } from '@playwright/test';
import { signIn } from './helpers/auth';

/** Seeded job whose level moved from SENIOR to JUNIOR (the title keeps the word "Senior"). */
const JUNIOR_JOB = 'Senior Frontend Engineer';

test('AC2: the job filter offers Intern, Fresher and Junior and never Senior', async ({ page }) => {
  await page.goto('/jobs');

  for (const label of ['Thực tập', 'Fresher', 'Junior']) {
    await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
  }
  await expect(page.getByText('Senior', { exact: true })).toHaveCount(0);
});

test('AC2: choosing Junior lists the migrated job, whose card says Junior', async ({ page }) => {
  await page.goto('/jobs?level=JUNIOR');

  const card = page.getByRole('link', { name: new RegExp(JUNIOR_JOB) });
  await expect(card).toBeVisible();
  await expect(page.getByText('Junior', { exact: true }).last()).toBeVisible();
  await expect(page.getByText('Senior', { exact: true })).toHaveCount(0);
});

test('AC2: the post-job form offers Intern, Fresher and Junior and never Senior', async ({
  page,
}) => {
  await signIn(page, 'recruiter@launchly.test');
  await page.goto('/recruiter/jobs/new');

  for (const name of [/^Intern/, /^Fresher/, /^Junior/]) {
    await expect(page.getByRole('radio', { name })).toBeVisible();
  }
  await expect(page.getByRole('radio', { name: /^Senior/ })).toHaveCount(0);
});
