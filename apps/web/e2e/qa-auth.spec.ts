import { expect, test } from '@playwright/test';
import { SEED_PASSWORD, signIn } from './helpers/auth';

const DUMMY_TOKEN = '0123456789abcdef0123456789abcdef01234567';

test.describe('QA auth flows', () => {
  test('login shows clear errors for invalid, locked, and unverified accounts', async ({
    page,
  }) => {
    await page.goto('/login');

    await page.getByLabel('Email').fill('candidate1@launchly.test');
    await page.getByLabel('Mật khẩu', { exact: true }).fill('WrongPassword!99');
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await expect(page.getByText('Email hoặc mật khẩu chưa chính xác.')).toBeVisible();

    await page.getByLabel('Email').fill('candidate.locked@launchly.test');
    await page.getByLabel('Mật khẩu', { exact: true }).fill(SEED_PASSWORD);
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await expect(
      page.getByText('Tài khoản đang bị khóa. Vui lòng liên hệ bộ phận hỗ trợ.'),
    ).toBeVisible();

    await page.getByLabel('Email').fill('candidate.unverified@launchly.test');
    await page.getByLabel('Mật khẩu', { exact: true }).fill(SEED_PASSWORD);
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await expect(
      page.getByText(
        'Tài khoản chưa được xác minh. Hãy kiểm tra email hoặc gửi lại liên kết xác minh.',
      ),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Gửi lại email xác minh' })).toBeVisible();
  });

  test('authenticated user can open account menu and sign out', async ({ page }) => {
    await signIn(page, 'candidate1@launchly.test');
    await expect(page).toHaveURL(/\/jobs/);

    const accountButton = page.getByRole('button', { name: /^Tài khoản / });
    await expect(accountButton).toBeVisible();
    await accountButton.click();

    await page.getByRole('menuitem', { name: 'Đăng xuất' }).click();
    await expect(page.getByRole('link', { name: 'Đăng nhập' })).toBeVisible();
  });

  test('register validates password rules and shows verification notice on success', async ({
    page,
  }) => {
    await page.goto('/register');

    const roleGroup = page.getByRole('radiogroup', { name: 'Loại tài khoản' });
    await roleGroup.getByText('Nhà tuyển dụng').click();

    await page.getByLabel('Email').fill('qa.new.recruiter@launchly.test');
    await page.getByLabel('Mật khẩu', { exact: true }).fill('short');
    await page.getByLabel('Nhập lại mật khẩu').fill('short');
    await page.getByRole('button', { name: 'Tạo tài khoản' }).click();
    await expect(page.getByText('Mật khẩu cần có từ 8 đến 128 ký tự.')).toBeVisible();

    await page.getByLabel('Mật khẩu', { exact: true }).fill('ValidPass123!');
    await page.getByLabel('Nhập lại mật khẩu').fill('DifferentPass123!');
    await page.getByRole('button', { name: 'Tạo tài khoản' }).click();
    await expect(page.getByText('Mật khẩu nhập lại chưa khớp.')).toBeVisible();

    // Mock /auth/register because test/CI runs without an SMTP server and API rolls back on 503.
    await page.route('**/api/auth/register', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Verification email sent.' }),
      });
    });

    await page.getByLabel('Nhập lại mật khẩu').fill('ValidPass123!');
    await page.getByRole('button', { name: 'Tạo tài khoản' }).click();

    await expect(page.getByRole('heading', { name: 'Xác minh tài khoản' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Gửi lại email xác minh' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Quay lại đăng nhập' })).toBeVisible();
  });

  test('verify-email handles missing, invalid, and valid tokens', async ({ page }) => {
    await page.goto('/verify-email');
    await expect(page.getByRole('heading', { name: 'Chưa có liên kết xác minh' })).toBeVisible();
    await expect(page.getByLabel('Email đăng ký')).toBeVisible();

    await page.goto(`/verify-email?token=${DUMMY_TOKEN}`);
    await expect(page.getByRole('heading', { name: 'Liên kết không còn hiệu lực' })).toBeVisible();

    await page.route('**/api/auth/verify-email', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Email verified.' }),
      });
    });

    await page.goto(`/verify-email?token=${DUMMY_TOKEN}`);
    await expect(page.getByRole('heading', { name: 'Email đã được xác minh' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Đến trang đăng nhập' })).toBeVisible();
  });

  test('forgot-password and reset-password handle validation, invalid tokens, and success', async ({
    page,
  }) => {
    await page.goto('/forgot-password');
    await page.getByLabel('Email').fill('candidate1@launchly.test');
    await page.getByRole('button', { name: 'Gửi liên kết đặt lại' }).click();
    await expect(page.getByRole('heading', { name: 'Kiểm tra email' })).toBeVisible();
    await expect(
      page.getByText('Yêu cầu đã được tiếp nhận. Nếu tài khoản tồn tại, email sẽ sớm được gửi.'),
    ).toBeVisible();

    await page.goto(`/reset-password?token=${DUMMY_TOKEN}`);
    await page.getByLabel('Mật khẩu mới').fill('NewPassword123!');
    await page.getByLabel('Nhập lại mật khẩu').fill('Mismatch123!');
    await page.getByRole('button', { name: 'Lưu mật khẩu mới' }).click();
    await expect(page.getByText('Mật khẩu nhập lại chưa khớp.')).toBeVisible();

    await page.getByLabel('Nhập lại mật khẩu').fill('NewPassword123!');
    await page.getByRole('button', { name: 'Lưu mật khẩu mới' }).click();
    await expect(page.getByRole('heading', { name: 'Liên kết không hợp lệ' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Yêu cầu liên kết mới' })).toBeVisible();

    await page.route('**/api/auth/reset-password', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Password reset.' }),
      });
    });

    await page.goto(`/reset-password?token=${DUMMY_TOKEN}`);
    await page.getByLabel('Mật khẩu mới').fill('NewPassword123!');
    await page.getByLabel('Nhập lại mật khẩu').fill('NewPassword123!');
    await page.getByRole('button', { name: 'Lưu mật khẩu mới' }).click();
    await expect(page.getByRole('heading', { name: 'Mật khẩu đã được cập nhật' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Đăng nhập' })).toBeVisible();
  });
});
