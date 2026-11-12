import { expect, type Page } from '@playwright/test';

/** Local demo password shared by every seeded account (`apps/api/prisma/seed/data.ts`). */
export const SEED_PASSWORD = 'Launchly@123';

/** Signs a seeded account in through the login form. */
export async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(SEED_PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).not.toHaveURL(/\/login/);
}
