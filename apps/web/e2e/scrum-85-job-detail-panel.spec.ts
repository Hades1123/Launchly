import { expect, test, type Page } from '@playwright/test';
import { signIn } from './helpers/auth';

const CANDIDATE = 'candidate1@launchly.test';
/** Seeded application of the candidate (`apps/api/prisma/seed/data.ts`). */
const APPLIED_JOB = 'Senior Frontend Engineer';

const panel = (page: Page) => page.getByRole('complementary', { name: 'Chi tiết việc làm' });
const cards = (page: Page) => page.getByRole('main').locator('a[href^="/jobs/"]:has(h3)');

test.use({ viewport: { width: 1440, height: 900 } });

test('AC2: the first job is shown in the panel when the page opens', async ({ page }) => {
  await page.goto('/jobs');

  const firstTitle = await cards(page).first().locator('h3').textContent();
  await expect(panel(page).getByRole('heading', { level: 2, name: firstTitle! })).toBeVisible();
  await expect(cards(page).first()).toHaveAttribute('aria-current', 'true');
});

test('AC1, AC3: clicking a job swaps the panel, keeps the page and survives a reload', async ({
  page,
}) => {
  await page.goto('/jobs');
  const second = cards(page).nth(1);
  const title = (await second.locator('h3').textContent())!;

  await second.click();

  await expect(page).toHaveURL(/\/jobs\?job=[0-9a-f-]{36}$/);
  await expect(panel(page).getByRole('heading', { level: 2, name: title })).toBeVisible();
  await expect(second).toHaveAttribute('aria-current', 'true');

  await page.reload();
  await expect(panel(page).getByRole('heading', { level: 2, name: title })).toBeVisible();
});

test('E5: Back shows the previously selected job again', async ({ page }) => {
  await page.goto('/jobs');
  const firstTitle = (await cards(page).first().locator('h3').textContent())!;

  await cards(page).nth(1).click();
  await expect(page).toHaveURL(/job=/);
  await page.goBack();

  await expect(panel(page).getByRole('heading', { level: 2, name: firstTitle })).toBeVisible();
});

test('E2: a link to a job that is not in the list shows the first job', async ({ page }) => {
  await page.goto('/jobs?job=00000000-0000-4000-8000-0000000000ff');

  const firstTitle = (await cards(page).first().locator('h3').textContent())!;
  await expect(panel(page).getByRole('heading', { level: 2, name: firstTitle })).toBeVisible();
});

test('E1: no matching job shows the empty message and no panel', async ({ page }) => {
  await page.goto('/jobs?keyword=zzzz-no-such-job');

  await expect(page.getByText('Không tìm thấy việc làm phù hợp')).toBeVisible();
  await expect(panel(page)).toHaveCount(0);
});

test('AC4: Apply and Check my CV fit are in the panel', async ({ page }) => {
  await signIn(page, CANDIDATE);
  await page.goto(`/jobs?keyword=${encodeURIComponent(APPLIED_JOB)}`);

  await expect(panel(page).getByRole('button', { name: 'Đã ứng tuyển' })).toBeVisible();
  await expect(panel(page).getByRole('link', { name: 'Kiểm tra độ phù hợp CV' })).toHaveAttribute(
    'href',
    /\/cv-review\?jobId=/,
  );
});

test('AC5: on a phone, clicking a job still opens its own page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/jobs');
  const title = (await cards(page).first().locator('h3').textContent())!;

  await cards(page).first().click();

  await expect(page).toHaveURL(/\/jobs\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
});

test('picking a job at the bottom of the list scrolls back up to its details', async ({ page }) => {
  await page.goto('/jobs');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const last = cards(page).last();
  const title = (await last.locator('h3').textContent())!;

  await last.click({ position: { x: 24, y: 24 } });

  await expect(panel(page).getByRole('heading', { level: 2, name: title })).toBeInViewport();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});

test('scrolling past the end of the panel carries on to the page', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 600 });
  await page.goto(`/jobs?keyword=${encodeURIComponent(APPLIED_JOB)}`);
  const aside = panel(page);
  const box = (await aside.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 100);

  for (let i = 0; i < 10; i++) await page.mouse.wheel(0, 400);

  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  const atEnd = await aside.evaluate((el) => el.scrollTop + el.clientHeight >= el.scrollHeight - 1);
  expect(atEnd).toBe(true);
});
