import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { SEED_PASSWORD } from './helpers/auth';
import { resetModeration } from './helpers/db';

/**
 * SCRUM-73 has no admin page yet (SCRUM-74), so the admin decides through the API and the
 * candidate's job page and the recruiter's workspace show the effect. `E2E_DEMO=1` records a
 * slowed-down video for review.
 */
if (process.env.E2E_DEMO === '1') {
  test.use({ video: 'on', launchOptions: { slowMo: 1000 } });
}

const API = 'http://localhost:4100';
const ADMIN = 'admin@launchly.test';
/** The seeded pending job of FPT Digital (`apps/api/prisma/seed/data.ts`), owned by this recruiter. */
const RECRUITER = 'recruiter.fpt@launchly.test';
const PENDING_JOB = '00000000-0000-4000-8000-000000000403';
const PENDING_TITLE = 'Thực tập sinh Product Designer';
const REASON = 'Thiếu quy trình tuyển dụng và mức lương';

test.beforeEach(() => resetModeration());
// Later specs expect the seeded moderation state.
test.afterAll(() => resetModeration());

/**
 * Like `signIn` in `helpers/auth.ts`, but waits longer: the demo's slow motion plus the first
 * compile of the landing page can outlast its 5 s.
 */
async function signInRecruiter(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(RECRUITER);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(SEED_PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
}

async function adminHeaders(request: APIRequestContext) {
  const res = await request.post(`${API}/auth/login`, {
    data: { email: ADMIN, password: SEED_PASSWORD },
  });
  expect(res.ok()).toBe(true);
  return { Authorization: `Bearer ${(await res.json()).accessToken}` };
}

test('AC1: an approved job becomes visible to candidates', async ({ page, request }) => {
  await page.goto(`/jobs/${PENDING_JOB}`);
  await expect(page.getByRole('heading', { name: 'Job not found' })).toBeVisible();

  const headers = await adminHeaders(request);
  const approved = await request.post(`${API}/admin/jobs/${PENDING_JOB}/approve`, { headers });
  expect(approved.status()).toBe(200);
  expect((await approved.json()).status).toBe('PUBLISHED');

  await page.reload();
  await expect(page.getByRole('heading', { name: PENDING_TITLE })).toBeVisible();
});

test('E1: a second decision on the same job is refused', async ({ request }) => {
  const headers = await adminHeaders(request);
  expect(
    (await request.post(`${API}/admin/jobs/${PENDING_JOB}/approve`, { headers })).status(),
  ).toBe(200);
  const again = await request.post(`${API}/admin/jobs/${PENDING_JOB}/reject`, {
    headers,
    data: { reason: 'Too late' },
  });
  expect(again.status()).toBe(409);
});

test('AC4/E4: a rejected job shows the reason, and a resubmit keeps it until approval', async ({
  page,
  request,
}) => {
  const headers = await adminHeaders(request);
  const rejected = await request.post(`${API}/admin/jobs/${PENDING_JOB}/reject`, {
    headers,
    data: { reason: REASON },
  });
  expect(rejected.status()).toBe(200);

  await signInRecruiter(page);
  await page.goto(`/recruiter/jobs/${PENDING_JOB}`);
  await expect(page.getByText('Tin đã bị quản trị viên từ chối.', { exact: false })).toBeVisible();
  await expect(page.getByText(`Lý do: ${REASON}`)).toBeVisible();

  await page.getByRole('link', { name: 'Sửa và gửi lại' }).click();
  await page.getByLabel('Lương tối thiểu (USD/tháng)').fill('300');
  await page.getByLabel('Lương tối đa (USD/tháng)').fill('500');
  await page.getByRole('button', { name: /Thêm vòng/ }).click();
  await page.getByLabel('Tên vòng').last().fill('Phỏng vấn portfolio');
  await page.getByLabel('Hình thức').last().selectOption('ONLINE');
  await page.getByLabel('Thời lượng (phút)').last().fill('45');
  await page.getByRole('button', { name: 'Gửi duyệt lại' }).click();

  await expect(page).toHaveURL(/\/recruiter\/jobs$/);
  await expect(page.getByText(`Đã gửi tin “${PENDING_TITLE}”`)).toBeVisible();
  const card = page.getByRole('listitem').filter({ hasText: PENDING_TITLE });
  await expect(card.getByText('Chờ duyệt', { exact: true })).toBeVisible();

  const job = await request.get(`${API}/admin/jobs/${PENDING_JOB}`, { headers });
  expect(job.status()).toBe(200);
  expect(await job.json()).toMatchObject({ status: 'PENDING', moderationReason: REASON });
});
