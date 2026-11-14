import { expect, test } from '@playwright/test';
import { resetPractice } from './helpers/db';
import {
  BASE,
  CANDIDATE,
  OTHER_CANDIDATE,
  RECRUITER,
  answerUrl,
  questionsUrl,
  startRoundPractice,
  token,
} from './helpers/practice';

/**
 * SCRUM-65: AI practice questions and saved answers (this wave has no UI yet), driven over HTTP
 * against the seeded database and the deterministic mock AI. AC3's failure paths (missing description or
 * consent, informational round, malformed AI output, timeout) are unit-tested: the seed and the mock
 * AI cannot reach them over HTTP. The API limits interview AI calls to
 * a per-minute quota per candidate, so each test makes as few question requests as it can.
 */
const SOURCES = ['JOB_DESCRIPTION', 'JOB_REQUIREMENTS', 'ROUND_PROCESS'];

test.beforeEach(() => {
  resetPractice(CANDIDATE);
  resetPractice(OTHER_CANDIDATE);
});
test.afterAll(() => {
  resetPractice(CANDIDATE);
  resetPractice(OTHER_CANDIDATE);
});

test('AC1: an interactive round gets five text questions, each with a source label', async ({
  request,
}) => {
  const auth = await token(request, CANDIDATE);
  const { session, round } = await startRoundPractice(request, auth);
  expect(round.questions).toHaveLength(0);

  const res = await request.post(questionsUrl(session.id, round.id), { headers: auth });

  expect(res.status()).toBe(201);
  const questions = (await res.json()).rounds[0].questions as Record<string, unknown>[];
  expect(questions).toHaveLength(5);
  expect(questions.map((q) => q.position)).toEqual([1, 2, 3, 4, 5]);
  for (const question of questions) {
    expect(typeof question.prompt).toBe('string');
    expect((question.prompt as string).length).toBeGreaterThan(0);
    expect(SOURCES).toContain(question.source);
    expect(question.answer).toBeNull();
    // AC5: text only, nothing to time, record or score.
    expect(Object.keys(question).sort()).toEqual(['answer', 'id', 'position', 'prompt', 'source']);
  }

  // AC5: a recruiter cannot generate practice questions.
  const recruiter = await token(request, RECRUITER);
  const denied = await request.post(questionsUrl(session.id, round.id), { headers: recruiter });
  expect(denied.status()).toBe(403);
});

test('AC2: a repeat returns the same questions and saved answers survive and reload', async ({
  request,
}) => {
  const auth = await token(request, CANDIDATE);
  const { session, round } = await startRoundPractice(request, auth);
  const first = await request.post(questionsUrl(session.id, round.id), { headers: auth });
  const questions = (await first.json()).rounds[0].questions as { id: string }[];

  const saved = await request.put(answerUrl(session.id, questions[0]!.id), {
    headers: auth,
    data: { answer: '  First draft  ' },
  });
  expect(saved.status()).toBe(200);
  const replaced = await request.put(answerUrl(session.id, questions[0]!.id), {
    headers: auth,
    data: { answer: 'Second draft' },
  });
  expect(replaced.status()).toBe(200);

  const again = await request.post(questionsUrl(session.id, round.id), { headers: auth });

  expect(again.status()).toBe(200);
  const afterRepeat = (await again.json()).rounds[0].questions as {
    id: string;
    answer: { answer: string } | null;
  }[];
  expect(afterRepeat.map((q) => q.id)).toEqual(questions.map((q) => q.id));
  expect(afterRepeat[0]!.answer?.answer).toBe('Second draft');
  expect(afterRepeat[1]!.answer).toBeNull();

  const reloaded = await (await request.get(`${BASE}/${session.id}`, { headers: auth })).json();
  expect(reloaded.rounds[0].questions[0].answer.answer).toBe('Second draft');
  expect(reloaded.rounds[0].status).toBe('IN_PROGRESS');
});

test('AC5: blank answers, unknown rounds and other candidates are refused', async ({ request }) => {
  const auth = await token(request, CANDIDATE);
  const { session, round } = await startRoundPractice(request, auth);
  const generated = await request.post(questionsUrl(session.id, round.id), { headers: auth });
  const questions = (await generated.json()).rounds[0].questions as { id: string }[];

  const blank = await request.put(answerUrl(session.id, questions[0]!.id), {
    headers: auth,
    data: { answer: '   ' },
  });
  expect(blank.status()).toBe(400);
  expect((await blank.json()).error.code).toBe('VALIDATION_ERROR');

  const unknownRound = await request.post(
    questionsUrl(session.id, '00000000-0000-4000-8000-000000000000'),
    { headers: auth },
  );
  expect(unknownRound.status()).toBe(404);

  // Another candidate cannot generate for, or answer in, this session.
  const other = await token(request, OTHER_CANDIDATE);
  const foreign = await request.post(questionsUrl(session.id, round.id), { headers: other });
  expect(foreign.status()).toBe(404);
  const foreignAnswer = await request.put(answerUrl(session.id, questions[0]!.id), {
    headers: other,
    data: { answer: 'Not mine' },
  });
  expect(foreignAnswer.status()).toBe(404);
});
