import { expect, test } from '@playwright/test';
import { signIn } from './helpers/auth';

test('AC2: jobs list shows seeded jobs', async ({ page }) => {
  await page.goto('/jobs');

  await expect(page.getByText(/vị trí đang tuyển/)).toBeVisible();
  await expect(page.getByRole('heading', { level: 3 }).first()).toBeVisible();
});

test('AC2: seeded candidate can sign in', async ({ page }) => {
  await signIn(page, 'candidate1@launchly.test');
});
