import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { signIn, SEED_PASSWORD } from './helpers/auth';
import { resetModeration } from './helpers/db';

/**
 * SCRUM-71 has no admin page yet (SCRUM-72), so the admin decides through the API and the
 * recruiter's workspace shows the effect. `E2E_DEMO=1` records a slowed-down video for review.
 */
if (process.env.E2E_DEMO === '1') {
  test.use({ video: 'on', launchOptions: { slowMo: 1000 } });
}

const API = 'http://localhost:4100';
const ADMIN = 'admin@launchly.test';
const PENDING_RECRUITER = 'recruiter.pending@launchly.test'; // owns "Draft Ventures", PENDING
const REJECTED_RECRUITER = 'recruiter.rejected@launchly.test'; // owns "QuickCash Jobs", REJECTED

test.beforeEach(() => resetModeration());
// Later specs (e.g. scrum-26) expect the seeded moderation state.
test.afterAll(() => resetModeration());

async function adminHeaders(request: APIRequestContext) {
  const res = await request.post(`${API}/auth/login`, {
    data: { email: ADMIN, password: SEED_PASSWORD },
  });
  expect(res.ok()).toBe(true);
  return { Authorization: `Bearer ${(await res.json()).accessToken}` };
}

async function pendingCompanyId(
  request: APIRequestContext,
  headers: Record<string, string>,
  name: string,
) {
  const res = await request.get(`${API}/admin/companies`, { headers });
  expect(res.ok()).toBe(true);
  const company = (await res.json()).find((c: { name: string }) => c.name === name);
  expect(company, `${name} is in the pending queue`).toBeTruthy();
  return company.id as string;
}

function companyCard(page: Page, name: string) {
  return page.getByRole('complementary').getByText(name).locator('..');
}

test('AC1: an approved company becomes active for its recruiter and public', async ({
  page,
  request,
}) => {
  await signIn(page, PENDING_RECRUITER);
  await page.goto('/recruiter/jobs');
  await expect(companyCard(page, 'Draft Ventures').getByText('Chờ duyệt')).toBeVisible();

  const headers = await adminHeaders(request);
  const id = await pendingCompanyId(request, headers, 'Draft Ventures');
  const approved = await request.post(`${API}/admin/companies/${id}/approve`, { headers });
  expect(approved.status()).toBe(200);

  await page.reload();
  await expect(companyCard(page, 'Draft Ventures').getByText('Đã duyệt')).toBeVisible();
  await page.goto(`/companies/${id}`);
  await expect(page.getByText('Draft Ventures').first()).toBeVisible();
});

test('AC5/E1: a second decision on the same company is refused', async ({ request }) => {
  const headers = await adminHeaders(request);
  const id = await pendingCompanyId(request, headers, 'Draft Ventures');
  expect((await request.post(`${API}/admin/companies/${id}/approve`, { headers })).status()).toBe(
    200,
  );
  const again = await request.post(`${API}/admin/companies/${id}/reject`, {
    headers,
    data: { reason: 'Too late' },
  });
  expect(again.status()).toBe(409);
});

test('AC2/AC4/E5: a rejected recruiter registers a different company, which waits for review', async ({
  page,
}) => {
  await signIn(page, REJECTED_RECRUITER);
  await page.goto('/recruiter/jobs');
  await expect(companyCard(page, 'QuickCash Jobs').getByText('Bị từ chối')).toBeVisible();

  await page.goto('/company/register');
  await page.getByPlaceholder('Ví dụ: Launchly Corp').fill('QuickCash Careers');
  await page.getByPlaceholder(/123 Nguyễn Huệ/).fill('12 Lê Lợi, Quận 1, TP. Hồ Chí Minh');
  await page.getByRole('button', { name: 'Hoàn tất Đăng ký Công ty' }).click();
  await expect(page.getByText(/Đăng ký công ty thành công/)).toBeVisible();

  await page.goto('/recruiter/jobs');
  await expect(companyCard(page, 'QuickCash Careers').getByText('Chờ duyệt')).toBeVisible();
});
