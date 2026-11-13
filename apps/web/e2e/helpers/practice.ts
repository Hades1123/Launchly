import { expect, type APIRequestContext } from '@playwright/test';
import { SEED_PASSWORD } from './auth';

/** Interview practice API helpers, driven over HTTP against the seeded database. */
export const API = 'http://localhost:4100';
export const BASE = `${API}/candidates/me/interview-practice`;
export const CANDIDATE = 'candidate1@launchly.test';
export const OTHER_CANDIDATE = 'candidate2@launchly.test';
export const RECRUITER = 'recruiter@launchly.test';

export async function token(request: APIRequestContext, email: string) {
  const res = await request.post(`${API}/auth/login`, { data: { email, password: SEED_PASSWORD } });
  expect(res.ok()).toBe(true);
  return { Authorization: `Bearer ${(await res.json()).accessToken}` };
}

type Stage = { id: string; name: string; format: string | null; position: number };

/** A public job with at least `count` interactive (ONLINE or PHONE) rounds. */
export async function jobWithInteractiveRounds(request: APIRequestContext, count: number) {
  const list = await request.get(`${API}/jobs?limit=50`);
  expect(list.ok()).toBe(true);
  for (const item of (await list.json()).data as { id: string }[]) {
    const detail = await (await request.get(`${API}/jobs/${item.id}`)).json();
    const interactive = (detail.stages as Stage[]).filter(
      (s) => s.format === 'ONLINE' || s.format === 'PHONE',
    );
    if (interactive.length >= count) return { id: item.id as string, interactive };
  }
  throw new Error(`The seed has no published job with ${count} interactive rounds`);
}

type Round = { id: string; status: string; questions: { id: string }[] };

/** Starts practice for one interactive round of a job and returns the session. */
export async function startRoundPractice(request: APIRequestContext, auth: Record<string, string>) {
  const job = await jobWithInteractiveRounds(request, 1);
  const res = await request.post(BASE, {
    headers: auth,
    data: { jobId: job.id, consent: true, stageId: job.interactive[0]!.id },
  });
  expect(res.status()).toBe(201);
  const session = await res.json();
  return { session, round: session.rounds[0] as Round };
}

export const questionsUrl = (sessionId: string, roundId: string) =>
  `${BASE}/${sessionId}/rounds/${roundId}/questions`;
export const feedbackUrl = (sessionId: string, roundId: string) =>
  `${BASE}/${sessionId}/rounds/${roundId}/feedback`;
export const answerUrl = (sessionId: string, questionId: string) =>
  `${BASE}/${sessionId}/questions/${questionId}/answer`;

/** Saves an answer to every question of a round. */
export async function answerAll(
  request: APIRequestContext,
  auth: Record<string, string>,
  sessionId: string,
  questions: { id: string }[],
) {
  for (const [index, question] of questions.entries()) {
    const res = await request.put(answerUrl(sessionId, question.id), {
      headers: auth,
      data: { answer: `My answer ${index + 1}` },
    });
    expect(res.status()).toBe(200);
  }
}
