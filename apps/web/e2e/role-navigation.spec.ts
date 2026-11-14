import { expect, test, type Page } from '@playwright/test';
import { SEED_PASSWORD, signIn, waitForSession } from './helpers/auth';

const ADMIN = 'admin@launchly.test';
const RECRUITER = 'recruiter@launchly.test';
const CANDIDATE = 'candidate1@launchly.test';

test.use({ viewport: { width: 1280, height: 800 } });

function mainNav(page: Page) {
  return page.getByRole('banner').getByRole('navigation', { name: 'Điều hướng chính' });
}

test('an admin lands on the moderation page after signing in', async ({ page }) => {
  await signIn(page, ADMIN);
  await expect(page).toHaveURL(/\/admin\/moderation$/);
});

test('a recruiter lands on their jobs page after signing in', async ({ page }) => {
  await signIn(page, RECRUITER);
  await expect(page).toHaveURL(/\/recruiter\/jobs$/);
});

test('a recruiter is not sent back to a candidate page', async ({ page }) => {
  await page.goto('/login?next=%2Fapplications');
  await page.getByLabel('Email').fill(RECRUITER);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(SEED_PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL(/\/recruiter\/jobs$/);
});

test('a recruiter sees jobs and their workspace in the header menu', async ({ page }) => {
  await signIn(page, RECRUITER);
  await page.goto('/jobs');
  await waitForSession(page);
  await expect(mainNav(page).getByRole('link')).toHaveText(['Việc làm', 'Quản lý tuyển dụng']);
});

test('an admin sees jobs and moderation in the header menu', async ({ page }) => {
  await signIn(page, ADMIN);
  await page.goto('/jobs');
  await waitForSession(page);
  await expect(mainNav(page).getByRole('link')).toHaveText(['Việc làm', 'Duyệt nội dung']);
});

test('a candidate keeps the full menu and the header has no notification bell', async ({
  page,
}) => {
  await signIn(page, CANDIDATE);
  await page.goto('/jobs');
  await waitForSession(page);
  await expect(mainNav(page).getByRole('link')).toHaveCount(5);
  await expect(page.getByRole('banner').getByRole('button', { name: /Thông báo/ })).toHaveCount(0);
});

test('signing out opens the login page', async ({ page }) => {
  await signIn(page, CANDIDATE);
  await page.goto('/jobs');
  await waitForSession(page);
  await page.getByRole('button', { name: /^Tài khoản/ }).click();
  await page.getByRole('menuitem', { name: 'Đăng xuất' }).click();
  await expect(page).toHaveURL(/\/login$/);
});
