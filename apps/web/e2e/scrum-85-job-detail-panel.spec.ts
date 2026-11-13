import { expect, test, type Page } from '@playwright/test';
import { signIn } from './helpers/auth';

const CANDIDATE = 'candidate1@launchly.test';
/** Seeded application of the candidate (`apps/api/prisma/seed/data.ts`). */
const APPLIED_JOB = 'Senior Frontend Engineer';

const panel = (page: Page) => page.getByRole('complementary', { name: 'Job details' });
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

  await expect(page.getByText('No matching jobs found')).toBeVisible();
  await expect(panel(page)).toHaveCount(0);
});

test('AC4: Apply and Check my CV fit are in the panel', async ({ page }) => {
  await signIn(page, CANDIDATE);
  await page.goto(`/jobs?keyword=${encodeURIComponent(APPLIED_JOB)}`);

  await expect(panel(page).getByRole('button', { name: 'Applied' })).toBeVisible();
  await expect(panel(page).getByRole('link', { name: 'Check my CV fit' })).toHaveAttribute(
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
