import { expect, test, type APIRequestContext } from '@playwright/test';
import { signIn, waitForSession } from './helpers/auth';
import { expirePractice, resetPractice } from './helpers/db';
import {
  BASE,
  CANDIDATE,
  OTHER_CANDIDATE,
  RECRUITER,
  answerAll,
  feedbackUrl,
  jobWithInteractiveRounds,
  questionsUrl,
  startRoundPractice,
  token,
} from './helpers/practice';

/**
 * SCRUM-69: practice history and the saved feedback and summary, in the browser. One completed
 * session is built once over HTTP with the deterministic mock AI (two of the ten allowed AI
 * calls per minute); the tests read it back through the UI. The seeded legacy session of
 * candidate1 (completed, no rounds) stays in the history on purpose.
 */
const DISCLAIMER =
  'AI-generated practice feedback is advisory and may be incorrect; it does not affect hiring decisions.';

let completed: { id: string; jobTitle: string; roundName: string };

async function buildCompletedSession(request: APIRequestContext) {
  const auth = await token(request, CANDIDATE);
  const { session, round } = await startRoundPractice(request, auth);
  const generated = await (
    await request.post(questionsUrl(session.id, round.id), { headers: auth })
  ).json();
  await answerAll(request, auth, session.id, generated.rounds[0].questions);
  const done = await request.post(feedbackUrl(session.id, round.id), { headers: auth });
  expect(done.status()).toBe(201);
  const finished = await done.json();
  expect(finished.status).toBe('COMPLETED');
  return {
    id: session.id as string,
    jobTitle: finished.jobTitle as string,
    roundName: finished.rounds[0].name as string,
  };
}

test.beforeAll(async ({ playwright }) => {
  resetPractice(CANDIDATE);
  resetPractice(OTHER_CANDIDATE);
  const request = await playwright.request.newContext();
  completed = await buildCompletedSession(request);
  await request.dispose();
});
test.afterAll(() => {
  resetPractice(CANDIDATE);
  resetPractice(OTHER_CANDIDATE);
});

test('AC1: a completed session shows its job, round, source labels, feedback and summary', async ({
  page,
}) => {
  await signIn(page, CANDIDATE);
  await waitForSession(page);

  await page.goto('/interview-practice?tab=history');
  const row = page.getByRole('listitem').filter({ hasText: completed.jobTitle }).first();
  await expect(row.getByText('Completed')).toBeVisible();
  await expect(row.getByText('1 round')).toBeVisible();

  await page.getByRole('link', { name: completed.jobTitle }).first().click();
  await expect(page).toHaveURL(`/interview-practice/${completed.id}`);

  await expect(page.getByRole('heading', { name: completed.jobTitle })).toBeVisible();
  const feedback = page.getByRole('region', { name: `Feedback for ${completed.roundName}` });
  await expect(feedback).toBeVisible();
  await expect(feedback.getByRole('heading', { name: 'Strengths' })).toBeVisible();
  await expect(feedback.getByRole('heading', { name: 'Things to improve' })).toBeVisible();
  await expect(feedback.getByText(/^From the /)).toHaveCount(5);
  await expect(page.getByRole('region', { name: 'Overall summary' })).toBeVisible();
});

test('AC2: empty, error and paged states of the history', async ({ page }) => {
  await test.step('a candidate without sessions sees an empty state', async () => {
    await signIn(page, OTHER_CANDIDATE);
    await waitForSession(page);
    await page.goto('/interview-practice?tab=history');
    await expect(page.getByText('No practice sessions yet.')).toBeVisible();
  });

  await test.step('history is requested ten at a time and paged', async () => {
    const item = (n: number) => ({
      id: `00000000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`,
      jobId: '00000000-0000-4000-8000-000000000401',
      jobTitle: `Paged job ${n}`,
      scope: 'FULL',
      status: 'COMPLETED',
      roundCount: 2,
      createdAt: '2026-11-01T09:00:00.000Z',
      completedAt: '2026-11-01T09:45:00.000Z',
    });
    const requested: string[] = [];
    await page.route('**/candidates/me/interview-practice?*', async (route) => {
      const url = new URL(route.request().url());
      requested.push(`${url.searchParams.get('page')}/${url.searchParams.get('limit')}`);
      const current = Number(url.searchParams.get('page'));
      await route.fulfill({
        json: {
          data: [item(current)],
          pagination: { page: current, limit: 10, total: 11, totalPages: 2 },
        },
      });
    });

    await page.goto('/interview-practice?tab=history');
    await expect(page.getByText('Paged job 1')).toBeVisible();
    await expect(page.getByText('Page 1 of 2')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Previous' })).toBeDisabled();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByText('Paged job 2')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
    // React strict mode in dev may repeat the first request; the pages and the limit are what matter.
    expect([...new Set(requested)]).toEqual(['1/10', '2/10']);
    await page.unroute('**/candidates/me/interview-practice?*');
  });

  await test.step('an API error shows an alert and can be retried', async () => {
    let failing = true;
    await page.route('**/candidates/me/interview-practice?*', async (route) => {
      if (failing)
        await route.fulfill({
          status: 500,
          json: { error: { code: 'INTERNAL_ERROR', message: 'boom' } },
        });
      else await route.continue();
    });
    await page.goto('/interview-practice?tab=history');
    await expect(
      page.getByRole('alert').filter({ hasText: 'Could not load your practice history.' }),
    ).toBeVisible();
    failing = false;
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByText('No practice sessions yet.')).toBeVisible();
  });
});

test('AC3: an unfinished session resumes within 24 hours and is gone after', async ({
  page,
  request,
}) => {
  const auth = await token(request, CANDIDATE);
  const job = await jobWithInteractiveRounds(request, 1);
  const started = await request.post(BASE, {
    headers: auth,
    data: { jobId: job.id, consent: true, stageId: job.interactive[0]!.id },
  });
  expect(started.status()).toBe(201);
  const open = await started.json();

  await signIn(page, CANDIDATE);
  await waitForSession(page);

  await test.step('it is listed with a Resume link that opens it', async () => {
    await page.goto('/interview-practice?tab=history');
    const resume = page.getByRole('link', { name: `Resume ${open.jobTitle}` });
    await expect(resume).toHaveAttribute('href', `/interview-practice/${open.id}`);
    await resume.click();
    await expect(page.getByRole('button', { name: 'Generate questions' })).toBeVisible();
  });

  await test.step('after the deadline it is not listed and cannot be opened', async () => {
    expirePractice(CANDIDATE);
    await page.goto('/interview-practice?tab=history');
    await expect(page.getByRole('link', { name: `Resume ${open.jobTitle}` })).toHaveCount(0);
    await page.goto(`/interview-practice/${open.id}`);
    await expect(page.getByRole('alert').filter({ hasText: 'no longer available' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Generate questions' })).toHaveCount(0);
  });
});

test('AC4: no score or verdict, and only the owner can see the results', async ({
  page,
  request,
}) => {
  await signIn(page, CANDIDATE);
  await waitForSession(page);
  await page.goto(`/interview-practice/${completed.id}`);
  await expect(page.getByRole('region', { name: 'Overall summary' })).toBeVisible();
  await expect(page.getByText(/score|percentile|ranking|verdict|pass rate/i)).toHaveCount(0);
  await expect(page.getByText(/%/)).toHaveCount(0);

  await test.step('the API refuses a recruiter and another candidate', async () => {
    const recruiter = await request.get(`${BASE}/${completed.id}`, {
      headers: await token(request, RECRUITER),
    });
    expect(recruiter.status()).toBe(403);
    const other = await request.get(`${BASE}/${completed.id}`, {
      headers: await token(request, OTHER_CANDIDATE),
    });
    expect(other.status()).toBe(404);
  });

  await test.step('the page shows a recruiter nothing', async () => {
    await page.context().clearCookies();
    await signIn(page, RECRUITER);
    await waitForSession(page);
    await page.goto(`/interview-practice/${completed.id}`);
    await expect(page.getByText('Only candidates can practice interviews.')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Overall summary' })).toHaveCount(0);
  });
});

test('AC5: the advisory disclaimer shows with the round feedback and the summary', async ({
  page,
}) => {
  await signIn(page, CANDIDATE);
  await waitForSession(page);
  await page.goto(`/interview-practice/${completed.id}`);

  const feedback = page.getByRole('region', { name: `Feedback for ${completed.roundName}` });
  await expect(feedback.getByText(DISCLAIMER)).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Overall summary' }).getByText(DISCLAIMER),
  ).toBeVisible();
});
