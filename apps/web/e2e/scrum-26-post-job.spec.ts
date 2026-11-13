import { expect, test, type Page } from '@playwright/test';
import { signIn } from './helpers/auth';

/** Seeded jobs of `recruiter@launchly.test` (Nimbus Labs, approved). */
const SEEDED_DRAFT = '00000000-0000-4000-8000-000000000406';
const SEEDED_PUBLISHED = '00000000-0000-4000-8000-000000000401';
const SEEDED_REJECTED = '00000000-0000-4000-8000-000000000407';

const SUBMIT = 'Gửi duyệt';
const DRAFT = 'Lưu nháp';

const uniqueTitle = (label: string) => `E2E ${label} ${Date.now().toString(36)}`;

async function fillRequired(page: Page, title: string) {
  await page.getByLabel('Vị trí tuyển dụng').fill(title);
  await page.getByRole('radio', { name: /^Intern/ }).check();
  await page.getByLabel('Địa điểm').selectOption('Ho Chi Minh City');
  await page.getByLabel('Mô tả công việc').fill('Xây dựng API cho sản phẩm cùng mentor.');
}

async function addRound(page: Page, name: string, format: string, minutes: string) {
  await page.getByRole('button', { name: /Thêm vòng/ }).click();
  await page.getByLabel('Tên vòng').last().fill(name);
  await page.getByLabel('Hình thức').last().selectOption(format);
  await page.getByLabel('Thời lượng (phút)').last().fill(minutes);
}

const noteBoxes = (page: Page) => page.getByRole('textbox', { name: /^Ghi chú \d+$/ });

test.describe('approved recruiter', () => {
  // Sign in once: the login endpoint allows 10 attempts per 2 minutes for the whole e2e run,
  // and the refresh token rotates, so the tests share one signed-in page.
  test.describe.configure({ mode: 'serial' });
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await signIn(page, 'recruiter@launchly.test');
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('AC1: posting a complete job sends it to Pending approval', async () => {
    const title = uniqueTitle('submit');
    await page.goto('/recruiter/jobs/new');
    await fillRequired(page, title);
    await page.getByLabel('Ngành nghề').selectOption('Technology');
    await page.getByLabel('Lương tối thiểu (USD/tháng)').fill('300');
    await page.getByLabel('Lương tối đa (USD/tháng)').fill('500');
    await addRound(page, 'Sàng lọc CV', 'ONLINE', '15');
    await addRound(page, 'Phỏng vấn kỹ thuật', 'ONSITE', '60');
    await page.getByRole('button', { name: /Thêm ghi chú/ }).click();
    await noteBoxes(page).first().fill('Mang theo laptop cá nhân.');
    await page.getByRole('button', { name: SUBMIT }).click();

    await expect(page).toHaveURL(/\/recruiter\/jobs$/);
    await expect(page.getByText(`Đã gửi tin “${title}”`)).toBeVisible();
    const card = page.getByRole('listitem').filter({ hasText: title });
    await expect(card.getByText('Chờ duyệt', { exact: true })).toBeVisible();
    // Not public until an admin approves it.
    const href = await card.getByRole('link', { name: title, exact: true }).getAttribute('href');
    const id = href?.split('/').at(-1);
    expect((await page.request.get(`/api/jobs/${id}`)).status()).toBe(404);
  });

  test('AC2: missing position and level show errors and nothing is submitted', async () => {
    await page.goto('/recruiter/jobs/new');
    await page.getByRole('button', { name: SUBMIT }).click();

    await expect(page.getByText('Vị trí tuyển dụng là bắt buộc.')).toBeVisible();
    await expect(page.getByText('Hãy chọn cấp bậc.')).toBeVisible();
    await expect(page).toHaveURL(/\/recruiter\/jobs\/new$/);
  });

  test('AC4: rounds are saved exactly as added, reordered and deleted', async () => {
    await page.goto('/recruiter/jobs/new');
    await fillRequired(page, uniqueTitle('rounds'));
    await addRound(page, 'Vòng A', 'ONLINE', '15');
    await addRound(page, 'Vòng B', 'PHONE', '20');
    await addRound(page, 'Vòng C', 'ASSIGNMENT', '120');
    await page.getByRole('button', { name: 'Chuyển vòng 3 lên' }).click();
    await page.getByRole('button', { name: 'Xóa vòng 1' }).click();
    await page.getByRole('button', { name: DRAFT }).click();

    await expect(page).toHaveURL(/\/edit\?saved=1$/);
    await page.reload();
    await expect(page.getByLabel('Tên vòng')).toHaveCount(2);
    await expect(page.getByLabel('Tên vòng').nth(0)).toHaveValue('Vòng C');
    await expect(page.getByLabel('Hình thức').nth(0)).toHaveValue('ASSIGNMENT');
    await expect(page.getByLabel('Thời lượng (phút)').nth(0)).toHaveValue('120');
    await expect(page.getByLabel('Tên vòng').nth(1)).toHaveValue('Vòng B');
  });

  test('AC5: a round with an empty name or format shows an error on that round', async () => {
    await page.goto('/recruiter/jobs/new');
    await page.getByRole('button', { name: /Thêm vòng/ }).click();
    await page.getByLabel('Thời lượng (phút)').fill('30');
    await page.getByRole('button', { name: SUBMIT }).click();

    await expect(page.getByText('Tên vòng là bắt buộc.')).toBeVisible();
    await expect(page.getByText('Hãy chọn hình thức.')).toBeVisible();
  });

  test('AC6: a sixth note is blocked with "Maximum 5 notes"', async () => {
    await page.goto('/recruiter/jobs/new');
    const add = page.getByRole('button', { name: /Thêm ghi chú/ });
    for (let i = 0; i < 6; i += 1) await add.click();

    await expect(noteBoxes(page)).toHaveCount(5);
    await expect(page.getByText('Tối đa 5 ghi chú.')).toBeVisible();
  });

  test('AC7: a partial form is saved as a Draft that candidates cannot see', async () => {
    const title = uniqueTitle('draft');
    await page.goto('/recruiter/jobs/new');
    await fillRequired(page, title);
    // Incomplete round and no industry or salary: fine for a draft.
    await page.getByRole('button', { name: /Thêm vòng/ }).click();
    await page.getByLabel('Tên vòng').fill('Chưa đặt hình thức');
    await page.getByRole('button', { name: DRAFT }).click();

    await expect(page).toHaveURL(/\/recruiter\/jobs\/[0-9a-f-]+\/edit\?saved=1$/);
    await expect(page.getByText('Đã lưu bản nháp.')).toBeVisible();
    await expect(page.getByLabel('Tên vòng')).toHaveValue('Chưa đặt hình thức');
    const id = page.url().split('/').at(-2);
    expect((await page.request.get(`/api/jobs/${id}`)).status()).toBe(404);

    await page.goto('/recruiter/jobs');
    const card = page.getByRole('listitem').filter({ hasText: title });
    await expect(card.getByText('Bản nháp', { exact: true })).toBeVisible();
    await card.getByRole('link', { name: `Tiếp tục chỉnh sửa ${title}` }).click();
    await expect(page.getByLabel('Vị trí tuyển dụng')).toHaveValue(title);
  });

  test('a completely empty form can still be saved as a draft', async () => {
    await page.goto('/recruiter/jobs/new');
    await page.getByRole('button', { name: DRAFT }).click();

    await expect(page).toHaveURL(/\/recruiter\/jobs\/[0-9a-f-]+\/edit\?saved=1$/);
    await expect(page.getByText('Đã lưu bản nháp.')).toBeVisible();
    await expect(page.getByLabel('Vị trí tuyển dụng')).toHaveValue('');

    // Clean up: the untitled draft is deleted from its own edit page.
    await page.getByRole('button', { name: 'Xóa bản nháp Bản nháp chưa đặt tên' }).click();
    await page
      .getByRole('dialog', { name: 'Xóa bản nháp?' })
      .getByRole('button', { name: 'Xóa bản nháp', exact: true })
      .click();
    await expect(page).toHaveURL(/\/recruiter\/jobs\?deleted=1$|\/recruiter\/jobs$/);
  });

  test('AC8: the negotiable choice is kept and no salary figures are stored', async () => {
    await page.goto('/recruiter/jobs/new');
    await fillRequired(page, uniqueTitle('salary'));
    await page.getByLabel('Lương tối thiểu (USD/tháng)').fill('900');
    await page.getByLabel(/Lương thỏa thuận/).check();
    await page.getByRole('button', { name: DRAFT }).click();

    await expect(page.getByText('Đã lưu bản nháp.')).toBeVisible();
    await page.reload();
    await expect(page.getByLabel(/Lương thỏa thuận/)).toBeChecked();
    await page.getByLabel(/Lương thỏa thuận/).uncheck();
    await expect(page.getByLabel('Lương tối thiểu (USD/tháng)')).toHaveValue('');
  });

  test('a submitted or approved job opens read-only on its detail page', async () => {
    await page.goto(`/recruiter/jobs/${SEEDED_PUBLISHED}/edit`);
    await expect(page).toHaveURL(new RegExp(`/recruiter/jobs/${SEEDED_PUBLISHED}$`));
    await expect(page.getByText('Tin đang hiển thị cho ứng viên.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sửa quy trình' })).toBeVisible();
    await expect(page.getByRole('button', { name: SUBMIT })).toHaveCount(0);
  });

  test('the avatar menu opens the recruiter workspace', async () => {
    await page.goto('/jobs');
    await page.getByRole('button', { name: /^Tài khoản/ }).click();
    await page.getByRole('menuitem', { name: 'Quản lý tuyển dụng' }).click();

    await expect(page).toHaveURL(/\/recruiter\/jobs$/);
    await expect(page.getByRole('heading', { name: 'Tin tuyển dụng' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Quản lý tuyển dụng' })).toBeVisible();
  });

  test('the status tabs filter the job list', async () => {
    await page.goto('/recruiter/jobs');
    const rows = page.getByRole('listitem');
    await expect(rows.first()).toBeVisible();

    await page.getByRole('button', { name: /^Bản nháp/ }).click();
    await expect(page).toHaveURL(/\?status=DRAFT$/);
    await expect(rows.first()).toBeVisible();
    await expect(rows.filter({ hasNotText: 'Bản nháp' })).toHaveCount(0);

    // The filter survives a reload through the URL.
    await page.reload();
    await expect(page.getByRole('button', { name: /^Bản nháp/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(rows.filter({ hasNotText: 'Bản nháp' })).toHaveCount(0);
  });

  test('a draft can be deleted after confirming', async () => {
    const title = uniqueTitle('delete');
    await page.goto('/recruiter/jobs/new');
    await fillRequired(page, title);
    await page.getByRole('button', { name: DRAFT }).click();
    await expect(page).toHaveURL(/\/edit\?saved=1$/);

    await page.goto('/recruiter/jobs?status=DRAFT');
    await page.getByRole('searchbox').fill(title);
    const row = page.getByRole('listitem').filter({ hasText: title });
    await row.getByRole('button', { name: `Xóa bản nháp ${title}` }).click();
    const dialog = page.getByRole('dialog', { name: 'Xóa bản nháp?' });
    // Cancelling keeps the draft.
    await dialog.getByRole('button', { name: 'Hủy' }).click();
    await expect(row).toBeVisible();

    await row.getByRole('button', { name: `Xóa bản nháp ${title}` }).click();
    await dialog.getByRole('button', { name: 'Xóa bản nháp', exact: true }).click();
    await expect(page.getByText(`Đã xóa bản nháp “${title}”.`)).toBeVisible();
    await expect(row).toHaveCount(0);
    await expect(page.getByText('Không có tin nào khớp với bộ lọc hiện tại.')).toBeVisible();
  });

  test('several drafts can be deleted at once', async () => {
    const titles = [uniqueTitle('bulk a'), uniqueTitle('bulk b')];
    for (const title of titles) {
      await page.goto('/recruiter/jobs/new');
      await fillRequired(page, title);
      await page.getByRole('button', { name: DRAFT }).click();
      await expect(page).toHaveURL(/\/edit\?saved=1$/);
    }

    await page.goto('/recruiter/jobs?status=DRAFT');
    await page.getByRole('searchbox').fill('E2E bulk');
    // The list searches 300 ms after typing and clears the selection when results arrive,
    // so wait for that search to finish before ticking drafts.
    await expect(page).toHaveURL(/[?&]q=E2E(\+|%20)bulk/);
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
    for (const title of titles) {
      await page.getByRole('checkbox', { name: `Chọn ${title}` }).check();
    }
    await expect(page.getByText('Đã chọn 2 bản nháp')).toBeVisible();
    await page.getByRole('button', { name: 'Xóa 2 bản nháp đã chọn' }).click();
    await page
      .getByRole('dialog', { name: 'Xóa 2 bản nháp?' })
      .getByRole('button', { name: 'Xóa 2 bản nháp', exact: true })
      .click();

    await expect(page.getByText('Đã xóa 2 bản nháp.')).toBeVisible();
    for (const title of titles) {
      await expect(page.getByRole('listitem').filter({ hasText: title })).toHaveCount(0);
    }
  });

  test('a rejected job opens for editing with its reason and can be resubmitted', async () => {
    await page.goto(`/recruiter/jobs/${SEEDED_REJECTED}`);
    await page.getByRole('link', { name: 'Sửa và gửi lại' }).click();

    await expect(page).toHaveURL(new RegExp(`/recruiter/jobs/${SEEDED_REJECTED}/edit$`));
    await expect(page.getByText('Tin đã bị quản trị viên từ chối.')).toBeVisible();
    await expect(page.getByText(/^Lý do:/)).toBeVisible();
    // Not submitted here, so the seeded job stays rejected for the next run.
    await expect(page.getByRole('button', { name: 'Gửi duyệt lại' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Xóa bản nháp/ })).toHaveCount(0);
  });

  test('a submitted job offers no delete', async () => {
    await page.goto('/recruiter/jobs?status=PUBLISHED');
    await expect(page.getByRole('listitem').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^Xóa bản nháp/ })).toHaveCount(0);
  });

  test('the job list is paged ten at a time', async () => {
    const summary = page.getByText(/^Hiển thị \d+–\d+ trong \d+ tin$/);
    const total = async () => Number((await summary.textContent())?.match(/trong (\d+) tin/)?.[1]);

    await page.goto('/recruiter/jobs');
    await expect(summary).toBeVisible();
    // A fresh database may hold ten jobs or fewer: add drafts until there is a second page.
    for (let i = await total(); i <= 10; i += 1) {
      await page.goto('/recruiter/jobs/new');
      await fillRequired(page, uniqueTitle(`page ${i}`));
      await page.getByRole('button', { name: DRAFT }).click();
      await expect(page).toHaveURL(/\/edit\?saved=1$/);
      await page.goto('/recruiter/jobs');
      await expect(summary).toBeVisible();
    }
    const count = await total();

    await expect(page.getByRole('listitem')).toHaveCount(10);
    await expect(summary).toHaveText(`Hiển thị 1–10 trong ${count} tin`);
    await page.getByRole('button', { name: 'Trang 2', exact: true }).click();
    await expect(page).toHaveURL(/\?page=2$/);
    await expect(summary).toHaveText(`Hiển thị 11–${Math.min(20, count)} trong ${count} tin`);
    await expect(page.getByRole('listitem')).toHaveCount(Math.min(10, count - 10));

    // The page survives a reload through the URL.
    await page.reload();
    await expect(page.getByRole('button', { name: 'Trang 2', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});

test('a candidate is kept out of the recruiter workspace', async ({ page }) => {
  await signIn(page, 'candidate1@launchly.test');
  await page.getByRole('button', { name: /^Tài khoản/ }).click();
  await expect(page.getByRole('menuitem', { name: 'Quản lý tuyển dụng' })).toHaveCount(0);

  await page.goto('/recruiter/jobs');
  await expect(page.getByText('Khu vực dành cho nhà tuyển dụng')).toBeVisible();
});

test('AC3: a recruiter whose company is pending is blocked with an explanation', async ({
  page,
}) => {
  await signIn(page, 'recruiter.pending@launchly.test');
  await page.goto('/recruiter/jobs/new');
  await expect(page.getByText(/đang chờ quản trị viên duyệt/)).toBeVisible();
  await expect(page.getByRole('button', { name: SUBMIT })).toHaveCount(0);
});

test('AC3: a recruiter whose company was rejected is blocked with an explanation', async ({
  page,
}) => {
  await signIn(page, 'recruiter.rejected@launchly.test');
  await page.goto('/recruiter/jobs/new');
  await expect(page.getByText(/đã bị từ chối/)).toBeVisible();
});

test("AC10: another recruiter cannot open someone else's draft", async ({ page }) => {
  await signIn(page, 'recruiter.fpt@launchly.test');
  await page.goto(`/recruiter/jobs/${SEEDED_DRAFT}/edit`);
  await expect(page.getByText('Bạn không có quyền sửa tin tuyển dụng này.')).toBeVisible();
});
