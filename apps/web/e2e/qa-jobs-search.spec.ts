import { expect, test } from '@playwright/test';

test.describe('QA public job search, filters, and pagination', () => {
  test('filters jobs by keyword, industry, level, and location and supports reset', async ({
    page,
  }) => {
    await page.goto('/jobs');

    const form = page.getByRole('form', { name: 'Job search and filters' });
    await expect(form).toBeVisible();

    await page.locator('#filter-keyword').fill('Frontend');
    await form.getByText('Junior', { exact: true }).click();
    await page.locator('#filter-industry').selectOption('Technology');
    await page.locator('#filter-location').selectOption('Ho Chi Minh City');
    await page.getByRole('button', { name: 'Apply Filters' }).click();

    await expect(page).toHaveURL(/keyword=Frontend/);
    await expect(page).toHaveURL(/level=JUNIOR/);
    await expect(page).toHaveURL(/industry=Technology/);
    await expect(page).toHaveURL(/location=Ho\+Chi\+Minh\+City|location=Ho%20Chi%20Minh%20City/);

    await page.getByRole('link', { name: 'Reset' }).click();
    await expect(page).toHaveURL(/\/jobs$/);
  });

  test('shows empty state on unmatched search and recovers via Clear all filters', async ({
    page,
  }) => {
    await page.goto('/jobs');

    await page.locator('#filter-keyword').fill('zzznonexistentjob999');
    await page.getByRole('button', { name: 'Apply Filters' }).click();

    await expect(page.getByText('No matching jobs found')).toBeVisible();
    await page.getByRole('link', { name: 'Clear all filters' }).click();
    await expect(page).toHaveURL(/\/jobs$/);
    await expect(page.getByText('No matching jobs found')).not.toBeVisible();
  });

  test('paginates across published jobs', async ({ page }) => {
    await page.goto('/jobs');

    const pagination = page.getByRole('navigation', { name: 'Job list pagination' });
    await expect(pagination).toBeVisible();
    await expect(pagination.getByText(/Page 1 of \d+/)).toBeVisible();

    await pagination.getByRole('link', { name: 'Next' }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(pagination.getByText(/Page 2 of \d+/)).toBeVisible();

    await pagination.getByRole('link', { name: 'Previous' }).click();
    await expect(pagination.getByText(/Page 1 of \d+/)).toBeVisible();
  });
});
