import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { signIn, SEED_PASSWORD } from './helpers/auth';
import { resetModeration } from './helpers/db';

/** `E2E_DEMO=1` records a slowed-down video for the reviewer. */
if (process.env.E2E_DEMO === '1') {
  test.use({ video: 'on', launchOptions: { slowMo: 1000 } });
  test.setTimeout(120_000);
}

const API = 'http://localhost:4100';
const ADMIN = 'admin@launchly.test';
const RECRUITER = 'recruiter.fpt@launchly.test'; // FPT Digital, approved
const SEEDED_PENDING = 'Thực tập sinh Product Designer'; // FPT Digital, no rounds, no notes

test.beforeEach(() => resetModeration());
// Later specs expect the seeded moderation state.
test.afterAll(() => resetModeration());

async function token(request: APIRequestContext, email: string) {
  const res = await request.post(`${API}/auth/login`, { data: { email, password: SEED_PASSWORD } });
  expect(res.ok()).toBe(true);
  return { Authorization: `Bearer ${(await res.json()).accessToken}` };
}

function jobBody(title: string) {
  return {
    action: 'SUBMIT',
    title,
    description: 'Xây dựng API cho nền tảng tuyển dụng.',
    level: 'INTERN',
    location: 'Remote',
    industry: 'Technology',
    requirements: ['Node.js cơ bản'],
    benefits: ['Mentor 1-1'],
    salary: { hidden: false, min: 500, max: 800 },
    rounds: [
      { name: 'Sàng lọc CV', format: 'ONLINE', estimatedDurationMinutes: 15 },
      { name: 'Phỏng vấn kỹ thuật', format: 'ONSITE', estimatedDurationMinutes: 60 },
    ],
    notes: ['Mang laptop khi phỏng vấn', 'Phản hồi trong 3 ngày'],
  };
}

/** Submits a job with two rounds and two notes as the FPT recruiter; returns its id. */
async function submitJob(request: APIRequestContext, title: string) {
  const res = await request.post(`${API}/recruiter/jobs`, {
    headers: await token(request, RECRUITER),
    data: jobBody(title),
  });
  expect(res.status()).toBe(201);
  return (await res.json()).id as string;
}

async function adminJobIdByTitle(request: APIRequestContext, title: string) {
  const res = await request.get(`${API}/admin/jobs`, { headers: await token(request, ADMIN) });
  return ((await res.json()) as { id: string; title: string }[]).find((j) => j.title === title)!.id;
}

async function openJob(page: Page, title: string) {
  await signIn(page, ADMIN);
  await page.goto('/admin/moderation/jobs');
  await page.getByRole('link', { name: title }).click();
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
}

test('AC1: the jobs tab lists submitted jobs with company, level and date', async ({
  page,
  request,
}) => {
  const title = `E2E moderation list ${Date.now()}`;
  await submitJob(request, title);
  await signIn(page, ADMIN);
  await page.goto('/admin/moderation');
  await page.getByRole('link', { name: 'Tin tuyển dụng' }).click();

  await expect(page).toHaveURL(/\/admin\/moderation\/jobs$/);
  const item = page.getByRole('listitem').filter({ hasText: title });
  await expect(item.getByText('FPT Digital')).toBeVisible();
  await expect(item.getByText(/Intern · Remote/)).toBeVisible();
  await expect(item.getByText(/Gửi lúc/)).toBeVisible();
});

test('AC2: the review page shows details, rounds and notes in order', async ({ page, request }) => {
  const title = `E2E moderation detail ${Date.now()}`;
  await submitJob(request, title);
  await openJob(page, title);

  await expect(page.getByText('Xây dựng API cho nền tảng tuyển dụng.')).toBeVisible();
  await expect(page.getByText(RECRUITER)).toBeVisible();
  const rounds = page
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { level: 3 }) });
  await expect(rounds.getByRole('heading', { level: 3 })).toHaveText([
    'Sàng lọc CV',
    'Phỏng vấn kỹ thuật',
  ]);
  await expect(page.getByText('Online · 15 min')).toBeVisible();
  await expect(page.getByText('Mang laptop khi phỏng vấn')).toBeVisible();
  await expect(page.getByText('Phản hồi trong 3 ngày')).toBeVisible();
});

test('AC3: approving publishes the job for candidates', async ({ page, request }) => {
  const title = `E2E moderation approve ${Date.now()}`;
  const id = await submitJob(request, title);
  await openJob(page, title);
  await page.getByRole('button', { name: 'Duyệt', exact: true }).click();

  await expect(page.getByText('Đã duyệt', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Từ chối' })).toHaveCount(0);
  await page.goto(`/jobs/${id}`);
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
});

test('AC4: rejecting needs a reason and shows it', async ({ page, request }) => {
  const title = `E2E moderation reject ${Date.now()}`;
  await submitJob(request, title);
  await openJob(page, title);
  await page.getByRole('button', { name: 'Từ chối' }).click();
  const dialog = page.getByRole('dialog', { name: 'Từ chối tin tuyển dụng' });
  await expect(dialog.getByRole('button', { name: 'Xác nhận từ chối' })).toBeDisabled();
  await dialog.getByLabel('Lý do từ chối').fill('Mô tả chưa rõ yêu cầu');
  await dialog.getByRole('button', { name: 'Xác nhận từ chối' }).click();

  await expect(page.getByText('Bị từ chối', { exact: true })).toBeVisible();
  await expect(page.getByText('Lý do: Mô tả chưa rõ yêu cầu')).toBeVisible();
});

test('E1: a job decided by another admin shows its status without buttons', async ({
  page,
  request,
}) => {
  const title = `E2E moderation conflict ${Date.now()}`;
  const id = await submitJob(request, title);
  await openJob(page, title);
  const approved = await request.post(`${API}/admin/jobs/${id}/approve`, {
    headers: await token(request, ADMIN),
  });
  expect(approved.ok()).toBe(true);

  await page.getByRole('button', { name: 'Duyệt', exact: true }).click();
  await expect(page.getByText('Mục này đã được xử lý')).toBeVisible();
  await expect(page.getByText('Đã duyệt', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Duyệt', exact: true })).toHaveCount(0);
});

test('E3: a job without notes shows no notes section', async ({ page }) => {
  await openJob(page, SEEDED_PENDING);
  await expect(page.getByText('Notes from the company')).toHaveCount(0);
});

test('E2: an empty queue shows the empty state', async ({ page }) => {
  // Other specs (e.g. scrum-26) leave submitted jobs in the shared database, so the list is
  // stubbed rather than emptied.
  await page.route('**/admin/jobs?*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  await signIn(page, ADMIN);
  await page.goto('/admin/moderation/jobs');
  await expect(page.getByText('Không có mục nào cần duyệt')).toBeVisible();
});

test('E4: a resubmitted job shows the previous rejection reason', async ({ page, request }) => {
  const title = `E2E moderation resubmit ${Date.now()}`;
  const id = await submitJob(request, title);
  const admin = await token(request, ADMIN);
  const rejected = await request.post(`${API}/admin/jobs/${id}/reject`, {
    headers: admin,
    data: { reason: 'Thiếu mức lương cụ thể' },
  });
  expect(rejected.ok()).toBe(true);
  const resubmitted = await request.put(`${API}/recruiter/jobs/${id}`, {
    headers: await token(request, RECRUITER),
    data: jobBody(title),
  });
  expect(resubmitted.ok()).toBe(true);
  expect(await adminJobIdByTitle(request, title)).toBe(id);

  await openJob(page, title);
  await expect(page.getByText('Chờ duyệt', { exact: true })).toBeVisible();
  await expect(page.getByText('Đã từ chối trước đó')).toBeVisible();
  await expect(page.getByText(/Thiếu mức lương cụ thể/)).toBeVisible();
});
