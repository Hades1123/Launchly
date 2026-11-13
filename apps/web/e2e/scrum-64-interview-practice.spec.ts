import { expect, test, type APIRequestContext } from '@playwright/test';
import { SEED_PASSWORD } from './helpers/auth';
import { expirePractice, resetPractice } from './helpers/db';

/**
 * SCRUM-63, SCRUM-64, SCRUM-66: interview practice API (this wave has no UI yet), driven over HTTP
 * against the seeded database. Sessions are cleared before and after, so the spec can rerun.
 */
const API = 'http://localhost:4100';
const BASE = `${API}/candidates/me/interview-practice`;
const CANDIDATE = 'candidate1@launchly.test';
const OTHER_CANDIDATE = 'candidate2@launchly.test';
const RECRUITER = 'recruiter@launchly.test';

test.beforeEach(() => {
  resetPractice(CANDIDATE);
  resetPractice(OTHER_CANDIDATE);
});
test.afterAll(() => {
  resetPractice(CANDIDATE);
  resetPractice(OTHER_CANDIDATE);
});

async function token(request: APIRequestContext, email: string) {
  const res = await request.post(`${API}/auth/login`, { data: { email, password: SEED_PASSWORD } });
  expect(res.ok()).toBe(true);
  return { Authorization: `Bearer ${(await res.json()).accessToken}` };
}

type Stage = { id: string; name: string; format: string | null; position: number };

/** A public job with at least one interactive round and one informational round. */
async function mixedJob(request: APIRequestContext) {
  const list = await request.get(`${API}/jobs?limit=50`);
  expect(list.ok()).toBe(true);
  for (const item of (await list.json()).data as { id: string }[]) {
    const detail = await (await request.get(`${API}/jobs/${item.id}`)).json();
    const stages = detail.stages as Stage[];
    const interactive = stages.filter((s) => s.format === 'ONLINE' || s.format === 'PHONE');
    const informational = stages.filter((s) => s.format !== 'ONLINE' && s.format !== 'PHONE');
    if (interactive.length > 0 && informational.length > 0) {
      return { id: item.id as string, title: detail.title as string, interactive, informational };
    }
  }
  throw new Error('The seed has no published job with both interactive and informational rounds');
}

test('AC1: a candidate starts full-workflow practice without applying, then resumes it', async ({
  request,
}) => {
  const auth = await token(request, CANDIDATE);
  const job = await mixedJob(request);

  const started = await request.post(BASE, {
    headers: auth,
    data: { jobId: job.id, consent: true },
  });
  expect(started.status()).toBe(201);
  const session = await started.json();
  expect(session).toMatchObject({ jobId: job.id, scope: 'FULL', status: 'IN_PROGRESS' });
  expect(session.interviewConsentAt).not.toBeNull();
  // Only the interactive rounds are practiced, in the job's order.
  expect(session.rounds.map((r: { stageId: string }) => r.stageId)).toEqual(
    job.interactive.map((s) => s.id),
  );

  const resumed = await request.get(`${BASE}/${session.id}`, { headers: auth });
  expect(resumed.status()).toBe(200);
  expect((await resumed.json()).id).toBe(session.id);

  // Starting again returns the same active session instead of a duplicate.
  const again = await request.post(BASE, { headers: auth, data: { jobId: job.id, consent: true } });
  expect(again.status()).toBe(200);
  expect((await again.json()).id).toBe(session.id);
});

test('AC1: a candidate can practice a single interactive round', async ({ request }) => {
  const auth = await token(request, CANDIDATE);
  const job = await mixedJob(request);
  const round = job.interactive[0]!;

  const started = await request.post(BASE, {
    headers: auth,
    data: { jobId: job.id, consent: true, stageId: round.id },
  });

  expect(started.status()).toBe(201);
  const session = await started.json();
  expect(session.scope).toBe('ROUND');
  expect(session.rounds).toHaveLength(1);
  expect(session.rounds[0]).toMatchObject({ stageId: round.id, name: round.name });
});

test('AC2: starting without the interview AI consent is refused', async ({ request }) => {
  const auth = await token(request, CANDIDATE);
  const job = await mixedJob(request);
  const before = (await (await request.get(BASE, { headers: auth })).json()).pagination.total;

  for (const data of [{ jobId: job.id }, { jobId: job.id, consent: false }]) {
    const res = await request.post(BASE, { headers: auth, data });
    expect(res.status()).toBe(400);
    expect((await res.json()).error.code).toBe('VALIDATION_ERROR');
  }
  // Nothing was created: the history still has only what it had before (the seeded completed session).
  const history = await (await request.get(BASE, { headers: auth })).json();
  expect(history.pagination.total).toBe(before);
});

test('AC3: an informational round cannot be practiced', async ({ request }) => {
  const auth = await token(request, CANDIDATE);
  const job = await mixedJob(request);

  const res = await request.post(BASE, {
    headers: auth,
    data: { jobId: job.id, consent: true, stageId: job.informational[0]!.id },
  });

  expect(res.status()).toBe(400);
  expect((await res.json()).error.code).toBe('VALIDATION_ERROR');
});

test('AC4: only the owner can resume a session; other roles and callers are refused', async ({
  request,
}) => {
  const owner = await token(request, CANDIDATE);
  const job = await mixedJob(request);
  const session = await (
    await request.post(BASE, { headers: owner, data: { jobId: job.id, consent: true } })
  ).json();

  const other = await request.get(`${BASE}/${session.id}`, {
    headers: await token(request, OTHER_CANDIDATE),
  });
  expect(other.status()).toBe(404);
  const recruiter = await request.get(`${BASE}/${session.id}`, {
    headers: await token(request, RECRUITER),
  });
  expect(recruiter.status()).toBe(403);
  const anonymous = await request.get(`${BASE}/${session.id}`);
  expect(anonymous.status()).toBe(401);
});

test('AC5: history is newest first, paginated, own data only and has no answers', async ({
  request,
}) => {
  const auth = await token(request, CANDIDATE);
  const job = await mixedJob(request);
  // The seeded candidate already has one completed session; it is history too.
  const before = (await (await request.get(BASE, { headers: auth })).json()).pagination.total;
  const full = await (
    await request.post(BASE, { headers: auth, data: { jobId: job.id, consent: true } })
  ).json();
  const single = await (
    await request.post(BASE, {
      headers: auth,
      data: { jobId: job.id, consent: true, stageId: job.interactive[0]!.id },
    })
  ).json();

  const page1 = await (await request.get(`${BASE}?page=1&limit=1`, { headers: auth })).json();
  expect(page1.pagination).toEqual({
    page: 1,
    limit: 1,
    total: before + 2,
    totalPages: before + 2,
  });
  expect(page1.data.map((s: { id: string }) => s.id)).toEqual([single.id]);
  const page2 = await (await request.get(`${BASE}?page=2&limit=1`, { headers: auth })).json();
  expect(page2.data.map((s: { id: string }) => s.id)).toEqual([full.id]);
  expect(page1.data[0]).not.toHaveProperty('rounds');
  expect(page1.data[0]).toMatchObject({ jobTitle: job.title, roundCount: 1 });

  const others = await (
    await request.get(BASE, { headers: await token(request, OTHER_CANDIDATE) })
  ).json();
  expect(others.data).toEqual([]);

  const tooMany = await request.get(`${BASE}?limit=51`, { headers: auth });
  expect(tooMany.status()).toBe(400);
});

test('AC6 (SCRUM-66): an expired incomplete session is inaccessible before any cleanup runs', async ({
  request,
}) => {
  const auth = await token(request, CANDIDATE);
  const job = await mixedJob(request);
  const session = await (
    await request.post(BASE, { headers: auth, data: { jobId: job.id, consent: true } })
  ).json();

  expirePractice(CANDIDATE);

  const resume = await request.get(`${BASE}/${session.id}`, { headers: auth });
  expect(resume.status()).toBe(404);
  const history = await (await request.get(BASE, { headers: auth })).json();
  expect(history.data.map((s: { id: string }) => s.id)).not.toContain(session.id);
});
