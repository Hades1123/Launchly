import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { signIn, SEED_PASSWORD } from './helpers/auth';
import { resetApplication } from './helpers/db';

const API = 'http://localhost:4100';
const CANDIDATE = 'candidate1@launchly.test';
const OTHER_CANDIDATE = 'candidate2@launchly.test';
const RECRUITER = 'recruiter@launchly.test';

/** Seeded applications (`apps/api/prisma/seed/data.ts`). */
const INTERVIEW_JOB = 'Senior Frontend Engineer'; // candidate1, INTERVIEW, 3 history rows
const SUBMITTED_JOB = 'Thực tập sinh Frontend React'; // candidate1, SUBMITTED
const REJECTED_JOB = 'Chuyên viên Phân tích Dữ liệu'; // candidate2, REJECTED
/** Open job of the seeded recruiter, used for the status-change flow. */
const FLOW_JOB = 'Lập trình viên Backend Node.js';

function row(page: Page, title: string) {
  return page.getByRole('article').filter({ hasText: title });
}

async function apiLogin(request: APIRequestContext, email: string) {
  const res = await request.post(`${API}/auth/login`, { data: { email, password: SEED_PASSWORD } });
  expect(res.ok()).toBe(true);
  const { accessToken } = await res.json();
  return { Authorization: `Bearer ${accessToken}` };
}

test('AC1: rows show job link, company, status, round and last update, with no mock banner', async ({
  page,
}) => {
  await signIn(page, CANDIDATE);
  await page.goto('/applications');

  await expect(page.getByRole('heading', { level: 1, name: 'My applications' })).toBeVisible();
  await expect(page.getByText('Dữ liệu minh họa')).toHaveCount(0);
  const item = row(page, INTERVIEW_JOB);
  await expect(item.getByRole('link', { name: INTERVIEW_JOB })).toHaveAttribute(
    'href',
    /\/jobs\/[0-9a-f-]{36}$/,
  );
  await expect(item.getByText('Nimbus Labs')).toBeVisible();
  await expect(item.getByText('Interview', { exact: true })).toBeVisible();
  await expect(item.getByText(/^Round:/)).toBeVisible();
  await expect(item.getByText(/^Updated /)).toBeVisible();
});

test('AC5: an applied job appears with status Submitted', async ({ page }) => {
  await signIn(page, CANDIDATE);
  await page.goto('/applications');

  await expect(row(page, SUBMITTED_JOB).getByText('Submitted', { exact: true })).toBeVisible();
});

test('AC2: a status change by a recruiter shows after reload', async ({ page, request }) => {
  resetApplication(CANDIDATE, FLOW_JOB);
  const candidateAuth = await apiLogin(request, CANDIDATE);
  const profile = await (
    await request.get(`${API}/candidates/profile`, { headers: candidateAuth })
  ).json();
  const jobs = await (await request.get(`${API}/jobs`, { params: { keyword: FLOW_JOB } })).json();
  const applied = await request.post(`${API}/applications`, {
    headers: candidateAuth,
    data: { jobId: jobs.data[0].id, resumeId: profile.resumes[0].id },
  });
  expect(applied.status()).toBe(201);
  const { id } = await applied.json();

  await signIn(page, CANDIDATE);
  await page.goto('/applications');
  await expect(row(page, FLOW_JOB).getByText('Submitted', { exact: true })).toBeVisible();

  const recruiterAuth = await apiLogin(request, RECRUITER);
  const changed = await request.patch(`${API}/applications/${id}/status`, {
    headers: recruiterAuth,
    data: { status: 'SCREENING' },
  });
  expect(changed.ok()).toBe(true);
  await page.reload();

  await expect(row(page, FLOW_JOB).getByText('Screening', { exact: true })).toBeVisible();
});

test('AC3: a rejected application is shown as a final state', async ({ page }) => {
  await signIn(page, OTHER_CANDIDATE);
  await page.goto('/applications');

  const item = row(page, REJECTED_JOB);
  await expect(item.getByText('Rejected', { exact: true })).toBeVisible();
  await expect(item.getByText('Final')).toBeVisible();
});

test('AC3: expanding a row shows the status stepper and the current round', async ({ page }) => {
  await signIn(page, CANDIDATE);
  await page.goto('/applications');

  const item = row(page, INTERVIEW_JOB);
  await item.getByRole('button', { name: 'Show details' }).click();

  const history = item.getByRole('list', { name: 'Status history' });
  await expect(history.getByRole('listitem')).toHaveCount(3);
  // The stepper marks where the application stands now: the last step is the current one.
  await expect(history.getByRole('listitem').last()).toHaveAttribute('aria-current', 'step');
  await expect(history.getByRole('listitem').first()).not.toHaveAttribute('aria-current', 'step');
  await expect(history.getByText('Submitted')).toBeVisible();
  await expect(history.getByText('Screening')).toBeVisible();
  await expect(history.getByText('Interview')).toBeVisible();
  const rounds = item.getByRole('list', { name: 'Hiring rounds' });
  await expect(rounds.getByRole('listitem').first()).toBeVisible();
  await expect(rounds.getByText('Current round')).toHaveCount(1);
});

test('AC4: a candidate with no applications sees the empty state linking to jobs', async ({
  page,
}) => {
  await signIn(page, CANDIDATE);
  await page.route('**/api/applications/me', (route) => route.fulfill({ json: { data: [] } }));
  await page.goto('/applications');

  await expect(page.getByText("You haven't applied to any job yet.")).toBeVisible();
  await expect(page.getByRole('link', { name: 'Browse jobs' })).toHaveAttribute('href', '/jobs');
});

test('AC4: the list fits a phone width without horizontal scroll', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await signIn(page, CANDIDATE);
  await page.goto('/applications');
  await expect(row(page, INTERVIEW_JOB)).toBeVisible();
  await row(page, INTERVIEW_JOB).getByRole('button', { name: 'Show details' }).click();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
