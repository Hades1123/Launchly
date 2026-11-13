import { expect, test } from '@playwright/test';

const MENU = [
  'Việc làm',
  'Đánh giá CV',
  'Luyện phỏng vấn AI',
  'Việc đã ứng tuyển',
  'Hồ sơ của tôi',
];

test.describe('laptop', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('AC1: every menu item shows its full label on one line', async ({ page }) => {
    await page.goto('/jobs');
    const nav = page.getByRole('banner').getByRole('navigation', { name: 'Điều hướng chính' });

    for (const label of MENU) {
      const box = await nav.getByRole('link', { name: label, exact: true }).boundingBox();
      // One line of text-sm plus py-2 is 36px; a wrapped label would be about 56px.
      expect(box!.height, label).toBeLessThan(44);
    }
    await expect(nav.getByRole('link', { name: 'Việc làm' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  test('D2: the header has no search box, saved-jobs or sign-up button', async ({ page }) => {
    await page.goto('/jobs');
    const header = page.getByRole('banner');

    await expect(header.getByRole('searchbox')).toHaveCount(0);
    await expect(header.getByRole('button', { name: 'Tin tuyển dụng đã lưu' })).toHaveCount(0);
    await expect(header.getByRole('link', { name: 'Tạo tài khoản' })).toHaveCount(0);
    await expect(header.getByRole('link', { name: 'Đăng nhập' })).toBeVisible();
    await expect(header.getByRole('button', { name: 'Mở menu' })).toBeHidden();
  });
});

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('AC5: the menu button lists every item and closes after navigating', async ({ page }) => {
    await page.goto('/');
    const header = page.getByRole('banner');

    await header.getByRole('button', { name: 'Mở menu' }).click();
    const menu = header.locator('#mobile-menu');
    await expect(menu.getByRole('link')).toHaveText(MENU);

    await menu.getByRole('link', { name: 'Việc làm' }).click();

    await expect(page).toHaveURL(/\/jobs$/);
    await expect(menu).toHaveCount(0);
    await expect(header.getByRole('button', { name: 'Mở menu' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  test('the open menu closes on Escape', async ({ page }) => {
    await page.goto('/');
    const header = page.getByRole('banner');

    await header.getByRole('button', { name: 'Mở menu' }).click();
    await expect(header.locator('#mobile-menu')).toBeVisible();
    await page.keyboard.press('Escape');

    await expect(header.locator('#mobile-menu')).toHaveCount(0);
  });
});
