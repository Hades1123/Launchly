import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { signIn, SEED_PASSWORD } from './helpers/auth';

const API = 'http://localhost:4100';
const RECRUITER = 'recruiter@launchly.test';
const CANDIDATE = 'candidate1@launchly.test';

/** Seeded jobs of the seeded recruiter (`apps/api/prisma/seed/data.ts`). */
const PUBLISHED_JOB = 'Lập trình viên Backend Node.js';
const DRAFT_JOB = 'Nhân viên Kinh doanh (bản nháp)';
/** Published job of another recruiter (`recruiter.lotus@launchly.test`). */
const FOREIGN_JOB = 'Customer Support Intern';

function row(page: Page, title: string) {
  return page.getByRole('listitem').filter({ hasText: title });
}

async function apiLogin(request: APIRequestContext, email: string) {
  const res = await request.post(`${API}/auth/login`, { data: { email, password: SEED_PASSWORD } });
  expect(res.ok()).toBe(true);
  const { accessToken } = await res.json();
  return { Authorization: `Bearer ${accessToken}` };
}

test('AC1: only own jobs are listed and each count matches the applicants API', async ({
  page,
  request,
}) => {
  const headers = await apiLogin(request, RECRUITER);
  const list = await (
    await request.get(`${API}/recruiter/jobs`, { headers, params: { limit: 50 } })
  ).json();
  const own = list.jobs as Array<{
    id: string;
    title: string;
    status: string;
    applicantCount: number;
  }>;
  const published = own.find((job) => job.title === PUBLISHED_JOB)!;
  const applicants = await (
    await request.get(`${API}/jobs/${published.id}/applications`, { headers })
  ).json();
  expect(published.applicantCount).toBe(applicants.data.length);
  expect(own.map((job) => job.title)).not.toContain(FOREIGN_JOB);

  await signIn(page, RECRUITER);
  await page.goto(`/recruiter/jobs?q=${encodeURIComponent(PUBLISHED_JOB)}`);

  await expect(
    row(page, PUBLISHED_JOB).getByText(`Ứng viên: ${published.applicantCount}`),
  ).toBeVisible();
  // A candidate has no recruiter jobs: the page never lists someone else's jobs.
  const candidateHeaders = await apiLogin(request, CANDIDATE);
  const forbidden = await request.get(`${API}/recruiter/jobs`, { headers: candidateHeaders });
  expect(forbidden.status()).toBe(403);
});

test('AC2: View applicants links to the applicants route of published jobs only', async ({
  page,
}) => {
  await signIn(page, RECRUITER);
  await page.goto(`/recruiter/jobs?q=${encodeURIComponent(PUBLISHED_JOB)}`);

  const link = row(page, PUBLISHED_JOB).getByRole('link', { name: /Xem ứng viên/ });
  await expect(link).toHaveAttribute('href', /\/recruiter\/jobs\/[0-9a-f-]{36}\/applicants$/);

  await page.goto(`/recruiter/jobs?q=${encodeURIComponent(DRAFT_JOB)}`);
  await expect(row(page, DRAFT_JOB)).toBeVisible();
  await expect(row(page, DRAFT_JOB).getByRole('link', { name: /Xem ứng viên/ })).toHaveCount(0);
});
