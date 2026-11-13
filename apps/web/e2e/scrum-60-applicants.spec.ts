import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { signIn, SEED_PASSWORD } from './helpers/auth';
import { resetApplication } from './helpers/db';

const API = 'http://localhost:4100';
const RECRUITER = 'recruiter@launchly.test';
const OTHER_RECRUITER = 'recruiter.fpt@launchly.test';
const CANDIDATE = 'candidate1@launchly.test';

/** Open job of the seeded recruiter (`apps/api/prisma/seed/data.ts`). */
const FLOW_JOB = 'Lập trình viên Backend Node.js';

type Applicant = {
  id: string;
  status: string;
  candidate: { name: string; headline: string | null; skills: string[] };
};

async function apiLogin(request: APIRequestContext, email: string) {
  const res = await request.post(`${API}/auth/login`, { data: { email, password: SEED_PASSWORD } });
  expect(res.ok()).toBe(true);
  const { accessToken } = await res.json();
  return { Authorization: `Bearer ${accessToken}` };
}

/** The candidate applies afresh to the flow job; returns the job id and the new applicant row. */
async function applyAfresh(request: APIRequestContext) {
  resetApplication(CANDIDATE, FLOW_JOB);
  const candidateAuth = await apiLogin(request, CANDIDATE);
  const profile = await (
    await request.get(`${API}/candidates/profile`, { headers: candidateAuth })
  ).json();
  const jobs = await (await request.get(`${API}/jobs`, { params: { keyword: FLOW_JOB } })).json();
  const jobId: string = jobs.data[0].id;
  const applied = await request.post(`${API}/applications`, {
    headers: candidateAuth,
    data: { jobId, resumeId: profile.resumes[0].id },
  });
  expect(applied.status()).toBe(201);
  const { id } = await applied.json();

  const recruiterAuth = await apiLogin(request, RECRUITER);
  const list = await (
    await request.get(`${API}/jobs/${jobId}/applications`, { headers: recruiterAuth })
  ).json();
  const applicant = (list.data as Applicant[]).find((a) => a.id === id)!;
  return { jobId, applicant };
}

function applicantRow(page: Page, name: string) {
  return page.getByRole('row').filter({ hasText: name });
}

test('AC1: the table shows name, headline, skills, submitted date, round and status', async ({
  page,
  request,
}) => {
  const { jobId, applicant } = await applyAfresh(request);
  await signIn(page, RECRUITER);
  await page.goto(`/recruiter/jobs/${jobId}/applicants`);

  const row = applicantRow(page, applicant.candidate.name);
  await expect(row).toBeVisible();
  if (applicant.candidate.headline) {
    await expect(row.getByText(applicant.candidate.headline)).toBeVisible();
  }
  for (const skill of applicant.candidate.skills) {
    await expect(row.getByText(skill, { exact: true })).toBeVisible();
  }
  await expect(row.getByText('Submitted', { exact: true })).toBeVisible();
  for (const column of ['Ứng viên', 'Kỹ năng', 'Ngày nộp', 'Vòng hiện tại', 'Trạng thái']) {
    await expect(page.getByRole('columnheader', { name: column })).toBeVisible();
  }
});

test('AC4: a recruiter moves an applicant to Interview and the candidate sees it in My applications', async ({
  page,
  request,
}) => {
  const { jobId, applicant } = await applyAfresh(request);
  const { name } = applicant.candidate;
  await signIn(page, RECRUITER);
  await page.goto(`/recruiter/jobs/${jobId}/applicants`);

  await page.getByRole('button', { name: `Cập nhật trạng thái của ${name}` }).click();
  await page.getByLabel('Trạng thái mới').selectOption({ label: 'Interview' });
  await page.getByLabel('Ghi chú (tùy chọn)').fill('Hẹn phỏng vấn kỹ thuật thứ Hai');
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click();

  await expect(page.getByRole('status')).toContainText(`Đã chuyển ${name} sang Interview.`);
  await expect(applicantRow(page, name).getByText('Interview', { exact: true })).toBeVisible();

  // AC1: the change persists and shows in the candidate's My applications.
  await page.context().clearCookies();
  await signIn(page, CANDIDATE);
  await page.goto('/applications');
  await expect(
    page.getByRole('article').filter({ hasText: FLOW_JOB }).getByText('Interview', { exact: true }),
  ).toBeVisible();
});

test('AC1: the status filter narrows the table client-side', async ({ page, request }) => {
  const { jobId, applicant } = await applyAfresh(request);
  await signIn(page, RECRUITER);
  await page.goto(`/recruiter/jobs/${jobId}/applicants`);
  const row = applicantRow(page, applicant.candidate.name);
  await expect(row).toBeVisible();

  await page.getByLabel('Lọc theo trạng thái').selectOption({ label: 'Interview' });
  await expect(row).toHaveCount(0);
  await expect(page.getByText('Không có ứng viên nào ở trạng thái này.')).toBeVisible();

  await page.getByLabel('Lọc theo trạng thái').selectOption({ label: 'Submitted' });
  await expect(row).toBeVisible();
});

test('AC1: View CV opens the applicant resume as a PDF', async ({ page, request }) => {
  const { jobId, applicant } = await applyAfresh(request);
  await signIn(page, RECRUITER);
  await page.goto(`/recruiter/jobs/${jobId}/applicants`);

  const resume = page.waitForResponse((res) =>
    res.url().includes(`/applications/${applicant.id}/resume`),
  );
  const [popup] = await Promise.all([
    page.waitForEvent('popup'),
    page.getByRole('button', { name: `Xem CV của ${applicant.candidate.name}` }).click(),
  ]);
  const response = await resume;
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/pdf');
  await popup.close();
});

test('AC2: a recruiter who does not own the job sees the forbidden state', async ({
  page,
  request,
}) => {
  const { jobId } = await applyAfresh(request);
  await signIn(page, OTHER_RECRUITER);
  await page.goto(`/recruiter/jobs/${jobId}/applicants`);

  await expect(
    page.getByText('Bạn không có quyền xem ứng viên của tin tuyển dụng này.'),
  ).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(0);
});
