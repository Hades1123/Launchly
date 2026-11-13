import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { signIn, SEED_PASSWORD } from './helpers/auth';
import { resetModeration } from './helpers/db';

/** `E2E_DEMO=1` records a slowed-down video for the reviewer. */
if (process.env.E2E_DEMO === '1') {
  test.use({ video: 'on', launchOptions: { slowMo: 1000 } });
  // slowMo makes each step slower than the default 30 s budget.
  test.setTimeout(120_000);
}

const API = 'http://localhost:4100';
const ADMIN = 'admin@launchly.test';
const RECRUITER = 'recruiter@launchly.test';
const REJECTED_RECRUITER = 'recruiter.rejected@launchly.test'; // owns "QuickCash Jobs", REJECTED
/** The only seeded pending company (owner `recruiter.pending@launchly.test`). */
const PENDING = 'Draft Ventures';

test.beforeEach(() => resetModeration());
// Later specs (e.g. scrum-26) expect the seeded moderation state.
test.afterAll(() => resetModeration());

async function openPendingCompany(page: Page) {
  await signIn(page, ADMIN);
  await page.goto('/admin/moderation');
  await page.getByRole('link', { name: PENDING }).click();
  await expect(page.getByRole('heading', { level: 1, name: PENDING })).toBeVisible();
}

async function adminHeaders(request: APIRequestContext) {
  const res = await request.post(`${API}/auth/login`, {
    data: { email: ADMIN, password: SEED_PASSWORD },
  });
  expect(res.ok()).toBe(true);
  return { Authorization: `Bearer ${(await res.json()).accessToken}` };
}

test('E3: a recruiter cannot open the moderation page', async ({ page }) => {
  await signIn(page, RECRUITER);
  await page.goto('/admin/moderation');
  await expect(page.getByText('Khu vực dành cho quản trị viên')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Duyệt nội dung' })).toHaveCount(0);
});

test('AC1: an admin opens the queue from the account menu and sees pending companies', async ({
  page,
}) => {
  await signIn(page, ADMIN);
  await page.goto('/');
  await page.getByRole('button', { name: /^Tài khoản/ }).click();
  await page.getByRole('menuitem', { name: 'Duyệt nội dung' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Duyệt nội dung' })).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Loại nội dung' }).getByRole('link', { name: 'Công ty' }),
  ).toHaveAttribute('aria-current', 'page');
  const item = page.getByRole('listitem').filter({ hasText: PENDING });
  await expect(item.getByRole('link', { name: PENDING })).toBeVisible();
  await expect(item.getByText(/Gửi lúc/)).toBeVisible();
});

test('AC2: the review page shows everything the recruiter submitted', async ({ page }) => {
  await openPendingCompany(page);
  await expect(page.getByText('recruiter.pending@launchly.test')).toBeVisible();
  for (const label of ['Địa chỉ', 'Lĩnh vực', 'Quy mô', 'Website', 'Mô tả']) {
    await expect(page.getByText(label, { exact: true })).toBeVisible();
  }
  await expect(page.getByText('Chờ duyệt', { exact: true })).toBeVisible();
});

test('AC3/E2: approving shows the decision, opens the public page and empties the queue', async ({
  page,
}) => {
  await openPendingCompany(page);
  await page.getByRole('button', { name: 'Duyệt', exact: true }).click();

  await expect(page.getByText('Đã duyệt')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Duyệt', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Từ chối' })).toHaveCount(0);

  const id = page.url().split('/').pop()!;
  await page.goto(`/companies/${id}`);
  await expect(page.getByText(PENDING).first()).toBeVisible();

  await page.goto('/admin/moderation');
  await expect(page.getByText('Không có mục nào cần duyệt')).toBeVisible();
});

test('D3/T3: rejecting needs a reason, then shows it', async ({ page }) => {
  await openPendingCompany(page);
  await page.getByRole('button', { name: 'Từ chối' }).click();

  const dialog = page.getByRole('dialog', { name: 'Từ chối công ty' });
  const confirm = dialog.getByRole('button', { name: 'Xác nhận từ chối' });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel('Lý do từ chối').fill('   ');
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel('Lý do từ chối').fill('Thiếu giấy phép kinh doanh');
  await confirm.click();

  await expect(page.getByText('Bị từ chối')).toBeVisible();
  await expect(page.getByText('Thiếu giấy phép kinh doanh')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Từ chối' })).toHaveCount(0);
});

test('E1: a company decided by another admin shows its status without buttons', async ({
  page,
  request,
}) => {
  await openPendingCompany(page);
  const id = page.url().split('/').pop()!;
  const headers = await adminHeaders(request);
  expect((await request.post(`${API}/admin/companies/${id}/approve`, { headers })).ok()).toBe(true);

  await page.getByRole('button', { name: 'Từ chối' }).click();
  const dialog = page.getByRole('dialog', { name: 'Từ chối công ty' });
  await dialog.getByLabel('Lý do từ chối').fill('Quá muộn');
  await dialog.getByRole('button', { name: 'Xác nhận từ chối' }).click();

  await expect(page.getByText('Mục này đã được xử lý')).toBeVisible();
  await expect(page.getByText('Đã duyệt')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Duyệt', exact: true })).toHaveCount(0);
});

test('AC4/E4: a rejected recruiter sees the reason and can register another company', async ({
  page,
}) => {
  await signIn(page, REJECTED_RECRUITER);
  await page.goto('/recruiter/jobs');
  const sidebar = page.getByRole('complementary');
  await expect(sidebar.getByText('Bị từ chối')).toBeVisible();
  await expect(sidebar.getByText(/Lý do:/)).toBeVisible();
  await sidebar.getByRole('link', { name: 'Đăng ký công ty khác' }).click();
  await expect(page).toHaveURL(/\/company\/register$/);
  await expect(page.getByPlaceholder('Ví dụ: Launchly Corp')).toHaveValue('');
});

test('a failed reject keeps the dialog open with the typed reason (review #2)', async ({
  page,
}) => {
  await openPendingCompany(page);
  await page.route('**/admin/companies/*/reject', (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'boom' } }),
    }),
  );
  await page.getByRole('button', { name: 'Từ chối' }).click();
  const dialog = page.getByRole('dialog', { name: 'Từ chối công ty' });
  await dialog.getByLabel('Lý do từ chối').fill('Thiếu giấy phép');
  await dialog.getByRole('button', { name: 'Xác nhận từ chối' }).click();

  await expect(dialog.getByRole('alert')).toBeVisible();
  await expect(dialog.getByLabel('Lý do từ chối')).toHaveValue('Thiếu giấy phép');
});

test('an unknown company shows a Vietnamese not-found message (review #3)', async ({ page }) => {
  await signIn(page, ADMIN);
  await page.goto('/admin/moderation/companies/00000000-0000-4000-8000-000000000000');
  await expect(page.getByText('Không tìm thấy công ty')).toBeVisible();
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('AC4/E4: a rejected recruiter sees the reason and the register link (review #1)', async ({
    page,
  }) => {
    await signIn(page, REJECTED_RECRUITER);
    await page.goto('/recruiter/jobs');
    const header = page.getByRole('banner');
    await expect(header.getByText(/Lý do:/)).toBeVisible();
    await header.getByRole('link', { name: 'Đăng ký công ty khác' }).click();
    await expect(page).toHaveURL(/\/company\/register$/);
  });
});
