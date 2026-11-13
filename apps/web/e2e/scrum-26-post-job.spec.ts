import { expect, test, type Page } from '@playwright/test';
import { signIn } from './helpers/auth';

/** Seeded jobs of `recruiter@launchly.test` (Nimbus Labs, approved). */
const SEEDED_DRAFT = '00000000-0000-4000-8000-000000000406';
const SEEDED_PUBLISHED = '00000000-0000-4000-8000-000000000401';

const SUBMIT = 'Gửi duyệt';
const DRAFT = 'Lưu nháp';

const uniqueTitle = (label: string) => `E2E ${label} ${Date.now().toString(36)}`;

async function fillRequired(page: Page, title: string) {
  await page.getByLabel('Vị trí tuyển dụng').fill(title);
  await page.getByLabel('Cấp bậc').selectOption('INTERN');
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

    await expect(page).toHaveURL(/\/recruiter\/jobs\?submitted=/);
    await expect(page.getByText(`Đã gửi tin “${title}”`)).toBeVisible();
    const card = page.getByRole('listitem').filter({ hasText: title });
    await expect(card.getByText('Chờ duyệt')).toBeVisible();
    // Not public until an admin approves it.
    const id = new URL(page.url()).searchParams.get('submitted');
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
    await expect(card.getByText('Bản nháp')).toBeVisible();
    await card.getByRole('link', { name: `Tiếp tục chỉnh sửa ${title}` }).click();
    await expect(page.getByLabel('Vị trí tuyển dụng')).toHaveValue(title);
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

  test('a submitted or approved job opens read-only', async () => {
    await page.goto(`/recruiter/jobs/${SEEDED_PUBLISHED}/edit`);
    await expect(
      page.getByText(/đang ở trạng thái Đã duyệt nên không\s+thể chỉnh sửa/),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: SUBMIT })).toHaveCount(0);
  });
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
