import { expect, test } from '@playwright/test';
import { signIn } from './helpers/auth';

/** Seeded, published job of an approved company (`apps/api/prisma/seed/data.ts`). */
const JOB_TITLE = 'Senior Frontend Engineer';

test('AC2: the hero search opens the jobs page filtered by the keyword', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('searchbox', { name: 'Tìm việc làm' }).fill(JOB_TITLE);
  await page.getByRole('button', { name: 'Tìm việc' }).click();

  await expect(page).toHaveURL(/\/jobs\?keyword=Senior\+Frontend\+Engineer$/);
  await expect(page.locator('#filter-keyword')).toHaveValue(JOB_TITLE);
  await expect(page.getByRole('link', { name: new RegExp(JOB_TITLE) })).toBeVisible();
});

test('AC3: the latest jobs (at most 6) open their details', async ({ page }) => {
  await page.goto('/');

  const section = page.getByRole('region', { name: 'Việc làm mới đăng' });
  const cards = section.getByRole('listitem').getByRole('link');
  await expect(cards.first()).toBeVisible();
  expect(await cards.count()).toBeLessThanOrEqual(6);

  const title = (await cards.first().locator('h3').textContent())!;
  await cards.first().click();

  await expect(page).toHaveURL(/\/jobs\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
});

test('AC4: the shared header and footer are on the home page, the API status card is gone', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.getByRole('contentinfo')).toBeVisible();
  await expect(page.getByText('API status')).toHaveCount(0);
});

test('D4: signed-out visitors get one sign-up button, signed-in users none', async ({ page }) => {
  await page.goto('/');
  const signUp = page.getByRole('link', { name: 'Tạo tài khoản' });
  await expect(signUp).toHaveCount(1);
  await expect(signUp).toHaveAttribute('href', '/register');

  await signIn(page, 'candidate1@launchly.test');
  await page.goto('/');
  await expect(page.getByRole('button', { name: /^Tài khoản/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Tạo tài khoản' })).toHaveCount(0);
});
