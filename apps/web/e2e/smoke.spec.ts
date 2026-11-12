import { expect, test } from '@playwright/test';

/** Local demo password shared by every seeded account (`apps/api/prisma/seed/data.ts`). */
const SEED_PASSWORD = 'Launchly@123';

test('AC2: jobs list shows seeded jobs', async ({ page }) => {
  await page.goto('/jobs');

  await expect(page.getByText(/positions available/)).toBeVisible();
  await expect(page.getByRole('heading', { level: 3 }).first()).toBeVisible();
});

test('AC2: seeded candidate can sign in', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('Email').fill('candidate1@launchly.test');
  await page.getByLabel('Mật khẩu', { exact: true }).fill(SEED_PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();

  await expect(page).not.toHaveURL(/\/login/);
});
