import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { signIn, waitForSession } from './helpers/auth';
import { resetPractice } from './helpers/db';
import {
  API,
  CANDIDATE,
  jobWithInteractiveRounds,
  questionsUrl,
  startRoundPractice,
  token,
} from './helpers/practice';

/**
 * SCRUM-68: the text-only practice flow (start, consent, questions, answers) in the browser.
 * The API runs with the deterministic mock AI, so generated questions are placeholders: the
 * tests count items and never read their text. Interview AI calls are limited to 10 per minute
 * per candidate; this spec makes at most three.
 */
test.beforeEach(() => resetPractice(CANDIDATE));
test.afterAll(() => resetPractice(CANDIDATE));

/** A public job with at least one interactive round, with its title and every stage. */
async function practiceJob(request: APIRequestContext) {
  const found = await jobWithInteractiveRounds(request, 1);
  const detail = await (await request.get(`${API}/jobs/${found.id}`)).json();
  return {
    id: found.id,
    title: detail.title as string,
    stages: detail.stages as { id: string; name: string; format: string | null }[],
    interactive: found.interactive,
  };
}

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
  const job = await practiceJob(request);
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
  const job = await practiceJob(request);
  await openPractice(page, job.id);

  const start = page.getByRole('button', { name: 'Start practice' });
  await expect(start).toBeDisabled();
  await page.getByRole('checkbox', { name: /I agree/ }).check();
  await expect(start).toBeEnabled();
  await page.getByRole('checkbox', { name: /I agree/ }).uncheck();
  await expect(start).toBeDisabled();
});

test('AC3: informational rounds, exactly five text questions and no timer or media', async ({
  page,
  request,
}) => {
  const job = await practiceJob(request);
  await openPractice(page, job.id);

  await test.step('rounds that are not ONLINE or PHONE are information only', async () => {
    const informational = job.stages.length - job.interactive.length;
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

  for (const url of ['/interview-practice', `/interview-practice/${session.id}`]) {
    await page.goto(url);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText(/score|percentile|ranking|verdict|pass rate/i)).toHaveCount(0);
    await expect(page.getByText(/%/)).toHaveCount(0);
    await expect(page.getByText('VinTech Solutions')).toHaveCount(0);
    await expect(page.getByText('Nguyễn Minh Anh')).toHaveCount(0);
  }
});

test('AC1: the start page is usable at 360 px wide', async ({ page, request }) => {
  const job = await practiceJob(request);
  await page.setViewportSize({ width: 360, height: 740 });
  await openPractice(page, job.id);

  await expect(page.getByRole('button', { name: 'Start practice' })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
