import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { signIn, waitForSession } from './helpers/auth';
import { resetPractice } from './helpers/db';
import { API, BASE, CANDIDATE, questionsUrl, startRoundPractice, token } from './helpers/practice';

/**
 * SCRUM-68: the text-only practice flow (start, consent, questions, answers) in the browser.
 * The API runs with the deterministic mock AI, so generated questions are placeholders: the
 * tests count items and never read their text. Interview AI calls are limited to 10 per minute
 * per candidate; this spec makes at most three.
 */
test.beforeEach(() => resetPractice(CANDIDATE));
test.afterAll(() => resetPractice(CANDIDATE));

type Stage = { id: string; name: string; format: string | null };
const isInteractive = (stage: Stage) => stage.format === 'ONLINE' || stage.format === 'PHONE';

/** A public job whose stages satisfy `accept`, with its title, stages and interactive rounds. */
async function findJob(request: APIRequestContext, accept: (stages: Stage[]) => boolean) {
  const list = await request.get(`${API}/jobs?limit=50`);
  for (const item of (await list.json()).data as { id: string }[]) {
    const detail = await (await request.get(`${API}/jobs/${item.id}`)).json();
    const stages = detail.stages as Stage[];
    if (accept(stages)) {
      return {
        id: item.id,
        title: detail.title as string,
        stages,
        interactive: stages.filter(isInteractive),
      };
    }
  }
  throw new Error('The seed has no published job with the rounds this test needs');
}

const anyInteractive = (stages: Stage[]) => stages.some(isInteractive);
/** At least two interactive rounds, so "all rounds" and "one round" differ. */
const severalInteractive = (stages: Stage[]) => stages.filter(isInteractive).length >= 2;
/** Interactive and informational rounds together. */
const mixedRounds = (stages: Stage[]) =>
  anyInteractive(stages) && stages.some((s) => !isInteractive(s));

async function openPractice(page: Page, jobId: string) {
  await signIn(page, CANDIDATE);
  await waitForSession(page);
  await page.goto(`/interview-practice?jobId=${jobId}`);
}

async function consentAndStart(page: Page) {
  await page.getByRole('checkbox', { name: /I agree/ }).check();
  await page.getByRole('button', { name: 'Start practice' }).click();
  await expect(page).toHaveURL(/\/interview-practice\/[0-9a-f-]{36}$/);
}

test('AC1: start the full workflow from a job link and a single round from the job list', async ({
  page,
  request,
}) => {
  const job = await findJob(request, severalInteractive);
  await signIn(page, CANDIDATE);
  await waitForSession(page);

  await test.step('the job page links to practice for that job', async () => {
    await page.goto(`/jobs/${job.id}`);
    await page.getByRole('link', { name: 'Practice this interview' }).click();
    await expect(page).toHaveURL(new RegExp(`/interview-practice\\?jobId=${job.id}$`));
    await expect(page.getByRole('heading', { level: 2, name: job.title })).toBeVisible();
  });

  await test.step('the default start practices every interactive round', async () => {
    await consentAndStart(page);
    const rounds = page.getByRole('list', { name: 'Rounds' }).getByRole('listitem');
    await expect(rounds).toHaveCount(job.interactive.length);
    expect(job.interactive.length).toBeGreaterThanOrEqual(2);
  });

  await test.step('a single round can be picked after finding the job in the list', async () => {
    await page.goto('/interview-practice');
    await page.getByRole('searchbox', { name: 'Search jobs' }).fill(job.title);
    await page.getByRole('button', { name: 'Search' }).click();
    await page.getByRole('link', { name: job.title }).first().click();
    await expect(page).toHaveURL(/\/interview-practice\?jobId=/);
    const only = job.interactive[0]!;
    await page.getByRole('radio', { name: new RegExp(only.name) }).check();
    await consentAndStart(page);
    await expect(page.getByRole('list', { name: 'Rounds' }).getByRole('listitem')).toHaveCount(1);
  });
});

test('AC2: starting needs the separate interview AI consent', async ({ page, request }) => {
  const job = await findJob(request, anyInteractive);
  await openPractice(page, job.id);

  const start = page.getByRole('button', { name: 'Start practice' });
  await expect(start).toBeDisabled();
  await page.getByRole('checkbox', { name: /I agree/ }).check();
  await expect(start).toBeEnabled();
  await page.getByRole('checkbox', { name: /I agree/ }).uncheck();
  await expect(start).toBeDisabled();
});

test('AC2: API errors are shown as they are and nothing is made up', async ({ page, request }) => {
  const job = await findJob(request, anyInteractive);
  const auth = await token(request, CANDIDATE);

  await test.step('a refused start shows the API message and stays on the page', async () => {
    await openPractice(page, job.id);
    await page.route('**/candidates/me/interview-practice', async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      await route.fulfill({
        status: 400,
        json: {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'This job has no description to practice from',
          },
        },
      });
    });
    await page.getByRole('checkbox', { name: /I agree/ }).check();
    await page.getByRole('button', { name: 'Start practice' }).click();
    await expect(
      page.getByRole('alert').filter({ hasText: 'This job has no description to practice from' }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/interview-practice\?jobId=/);
    await expect(page.getByRole('button', { name: 'Start practice' })).toBeEnabled();
    await page.unroute('**/candidates/me/interview-practice');
  });

  await test.step('a failed question generation shows the message and can be retried', async () => {
    const started = await request.post(BASE, {
      headers: auth,
      data: { jobId: job.id, consent: true, stageId: job.interactive[0]!.id },
    });
    const session = await started.json();
    await page.route('**/rounds/*/questions', (route) =>
      route.fulfill({
        status: 503,
        json: { error: { code: 'AI_UNAVAILABLE', message: 'The AI service is unavailable' } },
      }),
    );
    await page.goto(`/interview-practice/${session.id}`);
    await page.getByRole('button', { name: 'Generate questions' }).click();
    await expect(
      page.getByRole('alert').filter({ hasText: 'The AI service is unavailable' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Generate questions' })).toBeEnabled();
    await expect(page.getByRole('list', { name: 'Questions' })).toHaveCount(0);
  });
});

test('AC3: informational rounds, exactly five text questions and no timer or media', async ({
  page,
  request,
}) => {
  const job = await findJob(request, mixedRounds);
  await openPractice(page, job.id);

  await test.step('rounds that are not ONLINE or PHONE are information only', async () => {
    const informational = job.stages.length - job.interactive.length;
    expect(informational).toBeGreaterThan(0);
    await expect(page.getByText('Information only')).toHaveCount(informational);
    await expect(page.getByText('Interactive', { exact: true })).toHaveCount(
      job.interactive.length,
    );
  });

  await consentAndStart(page);
  await page.getByRole('button', { name: 'Generate questions' }).first().click();

  const questions = page.getByRole('list', { name: 'Questions' }).getByRole('listitem');
  await expect(questions).toHaveCount(5);
  await expect(page.getByText(/^From the /)).toHaveCount(5);
  await expect(page.getByText(/timer|countdown|microphone|recording|video/i)).toHaveCount(0);
  await expect(page.locator('audio, video')).toHaveCount(0);
});

test('AC4: a saved answer survives a reload', async ({ page, request }) => {
  const auth = await token(request, CANDIDATE);
  const { session, round } = await startRoundPractice(request, auth);
  const generated = await request.post(questionsUrl(session.id, round.id), { headers: auth });
  expect(generated.status()).toBe(201);

  await signIn(page, CANDIDATE);
  await waitForSession(page);
  await page.goto(`/interview-practice/${session.id}`);

  const box = page.getByRole('textbox', { name: 'Answer to question 1' });
  await box.fill('My saved answer');
  await page.getByRole('button', { name: 'Save answer 1' }).click();
  await expect(page.getByText('Saved', { exact: true })).toHaveCount(1);

  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Answer to question 1' })).toHaveValue(
    'My saved answer',
  );
  await expect(page.getByRole('textbox', { name: 'Answer to question 2' })).toHaveValue('');
});

test('AC5: no score, rank or verdict and none of the old mock content', async ({
  page,
  request,
}) => {
  const auth = await token(request, CANDIDATE);
  const { session, round } = await startRoundPractice(request, auth);
  await request.post(questionsUrl(session.id, round.id), { headers: auth });

  await signIn(page, CANDIDATE);
  await waitForSession(page);

  // The job list shows real job titles, so only the session page is scanned for score words.
  await page.goto('/interview-practice');
  await expect(page.getByRole('heading', { level: 1, name: 'Interview practice' })).toBeVisible();
  await expect(page.getByText('VinTech Solutions')).toHaveCount(0);
  await expect(page.getByText('Nguyễn Minh Anh')).toHaveCount(0);

  await page.goto(`/interview-practice/${session.id}`);
  await expect(page.getByRole('textbox', { name: /Answer to question/ })).toHaveCount(5);
  await expect(page.getByText(/score|percentile|ranking|verdict|pass rate/i)).toHaveCount(0);
  await expect(page.getByText(/%/)).toHaveCount(0);
  await expect(page.getByText('VinTech Solutions')).toHaveCount(0);
  await expect(page.getByText('Nguyễn Minh Anh')).toHaveCount(0);
});

test('AC1: the start page is usable at 360 px wide', async ({ page, request }) => {
  const job = await findJob(request, anyInteractive);
  await page.setViewportSize({ width: 360, height: 740 });
  await openPractice(page, job.id);

  await expect(page.getByRole('button', { name: 'Start practice' })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
