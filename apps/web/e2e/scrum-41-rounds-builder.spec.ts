import { expect, test } from '@playwright/test';
import { signIn } from './helpers/auth';

/** Seeded published job of `recruiter@launchly.test` with no rounds and no applications. */
const JOB_ID = '00000000-0000-4000-8000-00000000040e';
const SAVE = /Lưu quy trình/;

test.beforeEach(async ({ page }) => {
  await signIn(page, 'recruiter@launchly.test');
  await page.goto(`/recruiter/jobs/${JOB_ID}/rounds`);
});

test('AC1: recruiter adds a round and it persists after reload', async ({ page }) => {
  await page.getByRole('button', { name: /Thêm vòng/ }).click();
  await page.getByLabel('Tên vòng').fill('Phỏng vấn kỹ thuật');
  await page.getByLabel('Hình thức').selectOption('ONLINE');
  await page.getByLabel('Thời lượng (phút)').fill('45');
  await page.getByRole('button', { name: SAVE }).click();
  await expect(page.getByText('Đã lưu quy trình tuyển dụng.')).toBeVisible();

  await page.reload();
  await expect(page.getByLabel('Tên vòng')).toHaveValue('Phỏng vấn kỹ thuật');
  await expect(page.getByLabel('Hình thức')).toHaveValue('ONLINE');
  await expect(page.getByLabel('Thời lượng (phút)')).toHaveValue('45');

  // Leave the seeded job as it was.
  await page.getByRole('button', { name: 'Xóa vòng 1' }).click();
  await page.getByRole('button', { name: SAVE }).click();
  await expect(page.getByText('Đã lưu quy trình tuyển dụng.')).toBeVisible();
});

test('AC3: empty round name shows a validation error', async ({ page }) => {
  await page.getByRole('button', { name: /Thêm vòng/ }).click();
  await page.getByRole('button', { name: SAVE }).click();

  await expect(page.getByText('Tên vòng là bắt buộc.')).toBeVisible();
});

test('SCRUM-51 AC1: recruiter sets format and duration and they persist', async ({ page }) => {
  await page.getByRole('button', { name: /Thêm vòng/ }).click();
  await page.getByLabel('Tên vòng').fill('Bài tập về nhà');
  await page.getByLabel('Hình thức').selectOption('ASSIGNMENT');
  await page.getByLabel('Thời lượng (phút)').fill('120');
  await page.getByRole('button', { name: SAVE }).click();
  await expect(page.getByText('Đã lưu quy trình tuyển dụng.')).toBeVisible();

  await page.reload();
  await expect(page.getByLabel('Hình thức')).toHaveValue('ASSIGNMENT');
  await expect(page.getByLabel('Thời lượng (phút)')).toHaveValue('120');

  // Leave the seeded job as it was.
  await page.getByRole('button', { name: 'Xóa vòng 1' }).click();
  await page.getByRole('button', { name: SAVE }).click();
  await expect(page.getByText('Đã lưu quy trình tuyển dụng.')).toBeVisible();
});
