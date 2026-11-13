import { expect, test } from '@playwright/test';
import { resetPractice } from './helpers/db';
import {
  BASE,
  CANDIDATE,
  OTHER_CANDIDATE,
  RECRUITER,
  answerAll,
  answerUrl,
  feedbackUrl,
  jobWithInteractiveRounds,
  questionsUrl,
  startRoundPractice,
  token,
} from './helpers/practice';

/**
 * SCRUM-67: advisory round feedback and the overall summary (this wave has no UI yet), driven over
 * HTTP against the seeded database and the deterministic mock AI. Interview AI calls are limited
 * to 10 per minute per candidate, so the long flows are split between two candidates and the
 * limit test runs last, on candidate2, whose earlier calls (at most 8) leave room to reach it.
 */
const DISCLAIMER =
  'AI-generated practice feedback is advisory and may be incorrect; it does not affect hiring decisions.';

test.beforeEach(() => {
  resetPractice(CANDIDATE);
  resetPractice(OTHER_CANDIDATE);
});
test.afterAll(() => {
  resetPractice(CANDIDATE);
  resetPractice(OTHER_CANDIDATE);
});

test('AC1: feedback needs all five answers, then completes the round and the session', async ({
  request,
}) => {
  const auth = await token(request, CANDIDATE);
  const { session, round } = await startRoundPractice(request, auth);
  const generated = await request.post(questionsUrl(session.id, round.id), { headers: auth });
  const questions = (await generated.json()).rounds[0].questions as { id: string }[];

  await test.step('feedback before every question is answered is refused', async () => {
    const early = await request.post(feedbackUrl(session.id, round.id), { headers: auth });
    expect(early.status()).toBe(400);
    expect((await early.json()).error.code).toBe('VALIDATION_ERROR');
  });

  await answerAll(request, auth, session.id, questions);
  const done = await request.post(feedbackUrl(session.id, round.id), { headers: auth });

  expect(done.status()).toBe(201);
  const finished = await done.json();
  const feedback = finished.rounds[0].feedback;
  expect(finished.rounds[0].status).toBe('COMPLETED');
  expect(feedback.overview.length).toBeGreaterThan(0);
  expect(feedback.strengths.length).toBeGreaterThan(0);
  expect(feedback.improvements.length).toBeGreaterThan(0);
  for (const question of finished.rounds[0].questions) {
    expect(question.answer.feedback.length).toBeGreaterThan(0);
  }
  // The only round of this session is done, so the overall summary exists and the session ends.
  expect(finished.status).toBe('COMPLETED');
  expect(finished.summary.nextSteps.length).toBeGreaterThan(0);

  await test.step('AC2: a repeat returns the stored result', async () => {
    const again = await request.post(feedbackUrl(session.id, round.id), { headers: auth });
    expect(again.status()).toBe(200);
    const repeated = await again.json();
    expect(repeated.rounds[0].feedback).toEqual(feedback);
    expect(repeated.summary).toEqual(finished.summary);
  });

  await test.step('AC3: no score, rank or verdict anywhere, and the disclaimer is attached', async () => {
    expect(feedback.disclaimer).toBe(DISCLAIMER);
    expect(finished.summary.disclaimer).toBe(DISCLAIMER);
    expect(JSON.stringify(finished)).not.toMatch(/score|rank|percentile|verdict|recommend/i);
  });

  await test.step('answers are final once the round is completed', async () => {
    const late = await request.put(answerUrl(session.id, questions[0]!.id), {
      headers: auth,
      data: { answer: 'Too late' },
    });
    expect(late.status()).toBe(409);
  });

  await test.step('history keeps the completed session', async () => {
    const history = await (await request.get(BASE, { headers: auth })).json();
    const row = history.data.find((item: { id: string }) => item.id === session.id);
    expect(row.status).toBe('COMPLETED');
    expect(row.completedAt).not.toBeNull();
  });
});

test('AC1: the overall summary waits for the last selected round', async ({ request }) => {
  const auth = await token(request, OTHER_CANDIDATE);
  const job = await jobWithInteractiveRounds(request, 2);
  const started = await request.post(BASE, {
    headers: auth,
    data: { jobId: job.id, consent: true },
  });
  expect(started.status()).toBe(201);
  const session = await started.json();
  const rounds = session.rounds as { id: string }[];
  expect(rounds.length).toBeGreaterThanOrEqual(2);

  for (const round of rounds) {
    const generated = await request.post(questionsUrl(session.id, round.id), { headers: auth });
    expect(generated.status()).toBe(201);
    const roundQuestions = (await generated.json()).rounds.find(
      (r: { id: string }) => r.id === round.id,
    ).questions as { id: string }[];
    await answerAll(request, auth, session.id, roundQuestions);
  }

  const first = await request.post(feedbackUrl(session.id, rounds[0]!.id), { headers: auth });
  expect(first.status()).toBe(201);
  const afterFirst = await first.json();
  expect(afterFirst.status).toBe('IN_PROGRESS');
  expect(afterFirst.summary).toBeNull();
  expect(afterFirst.rounds[0].status).toBe('COMPLETED');

  let last = afterFirst;
  for (const round of rounds.slice(1)) {
    const res = await request.post(feedbackUrl(session.id, round.id), { headers: auth });
    expect(res.status()).toBe(201);
    last = await res.json();
  }
  expect(last.status).toBe('COMPLETED');
  expect(last.summary.disclaimer).toBe(DISCLAIMER);
});

test('AC5: only the owner can ask for feedback; other candidates and recruiters cannot', async ({
  request,
}) => {
  const auth = await token(request, CANDIDATE);
  const { session, round } = await startRoundPractice(request, auth);

  const recruiter = await token(request, RECRUITER);
  const denied = await request.post(feedbackUrl(session.id, round.id), { headers: recruiter });
  expect(denied.status()).toBe(403);

  const anonymous = await request.post(feedbackUrl(session.id, round.id));
  expect(anonymous.status()).toBe(401);

  const other = await token(request, OTHER_CANDIDATE);
  const foreignFeedback = await request.post(feedbackUrl(session.id, round.id), { headers: other });
  expect(foreignFeedback.status()).toBe(404);
  const foreignRead = await request.get(`${BASE}/${session.id}`, { headers: other });
  expect(foreignRead.status()).toBe(404);
});

test('AC4: question and feedback requests share one 10-per-minute limit', async ({ request }) => {
  const auth = await token(request, OTHER_CANDIDATE);
  const { session, round } = await startRoundPractice(request, auth);

  // Alternate the two routes: once the shared counter is used up, both answer 429.
  let limited: { status: number; body: { error: { code: string } } } | undefined;
  for (let i = 0; i < 12 && !limited; i++) {
    const res =
      i % 2 === 0
        ? await request.post(questionsUrl(session.id, round.id), { headers: auth })
        : await request.post(feedbackUrl(session.id, round.id), { headers: auth });
    if (res.status() === 429) limited = { status: 429, body: await res.json() };
    else expect([200, 201, 400]).toContain(res.status());
  }

  expect(limited?.body.error.code).toBe('RATE_LIMITED');
  const questionsAgain = await request.post(questionsUrl(session.id, round.id), { headers: auth });
  const feedbackAgain = await request.post(feedbackUrl(session.id, round.id), { headers: auth });
  expect(questionsAgain.status()).toBe(429);
  expect(feedbackAgain.status()).toBe(429);
});
