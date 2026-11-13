# Wave 7 — Practice UI and history

Plan approved by: SƠN NGUYỄN VÕ ĐỨC (nvdson2005) at ca3e265 (2026-11-14); both tickets assigned to the approver at their request

Wave plan source: `docs/plans/interview-practice-wave-plan.md` · Branch: `feat/wave-7-practice-ui-and-history` · Sprint: `SCRUM Sprint 3`

## Tickets

Build order: SCRUM-68 first (it creates the routes, API client and components SCRUM-69 extends).

| Key      | Title                                                    | Label   | Areas | Depends on                     | Assignee         |
| -------- | -------------------------------------------------------- | ------- | ----- | ------------------------------ | ---------------- |
| SCRUM-68 | Replace the mock interview demo with text-only practice  | feature | web   | SCRUM-64, SCRUM-65 (merged)    | SƠN NGUYỄN VÕ ĐỨC |
| SCRUM-69 | Show interview practice history and feedback             | feature | web   | SCRUM-66, SCRUM-67 (merged), SCRUM-68 | SƠN NGUYỄN VÕ ĐỨC |

## Clarifications

All answered by the recommended defaults ("defaults", user, 2026-11-14).

| #   | Ticket   | Question            | Answer                                                                                                                                                | Source             |
| --- | -------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Q1  | SCRUM-68 | Job picking         | "Practice this interview" link on the job detail page → `/interview-practice?jobId=…`; practice page also lists recent published jobs with `searchJobs` | user (default)     |
| Q2  | SCRUM-68 | Unsupported rounds  | All stages shown; only ONLINE/PHONE selectable (`isInteractiveRoundFormat`); others labelled "information only"                                       | user (default)     |
| Q3  | SCRUM-68 | Pages               | `/interview-practice` (start + History tab), `/interview-practice/[id]` (active round, then results)                                                   | user (default)     |
| Q4  | SCRUM-68 | Round flow          | Consent → start → generate questions per round (30 s loading, retry on 503) → five answers saved one by one → feedback enabled after five → summary    | user (default)     |
| Q5  | SCRUM-68 | Mobile              | Single column from 360 px; e2e at phone width                                                                                                          | user (default)     |
| Q6  | SCRUM-68 | Footer label        | `site-footer.tsx` label → "Luyện phỏng vấn AI"; nav and landing card unchanged                                                                         | user (default)     |
| Q7  | SCRUM-68 | Mock code           | Delete unimported mock files (`waveform`, `countdown-timer`, `session-bar`, `session-footer`, `conversation-panel`, `rich-text`, `action-button`, `feedback-panel`, `mock-interview-session`) | user (default) |
| Q8  | SCRUM-69 | History             | History tab, 10 per page via API pagination; rows link to `/interview-practice/[id]`; Resume only when `expiresAt` is in the future; expired → 404 notice | user (default)     |
| Q9  | SCRUM-69 | Source labels       | JOB_DESCRIPTION "From the job description", JOB_REQUIREMENTS "From the requirements", ROUND_PROCESS "From the interview round"                          | user (default)     |
| Q10 | both     | Language            | English copy in new practice UI; nav/footer keep Vietnamese                                                                                            | user (default)     |
| Q11 | both     | Docs                | Update `docs/Interview-Practice.md`; wave plan doc edits ride in this PR                                                                               | user (default), memory rule |
| Q12 | both     | Jira ticket text    | Corrections from the wave plan ("Ticket text to correct") shown at the approval gate, applied only after the yes                                       | user (default)     |

## Cross-ticket changes

- No `schema.prisma` change, no migration, no `packages/shared` or `apps/api` change: every contract exists (`practice*` schemas, `PRACTICE_FEEDBACK_DISCLAIMER`, `isInteractiveRoundFormat`).
- Shared by both tickets: `apps/web/src/lib/api/interview-practice.ts`, `apps/web/src/app/(main)/interview-practice/*`, `apps/web/src/components/interview-practice/*`, `docs/Interview-Practice.md`.
- Order: SCRUM-68 creates the API client, start page and `[id]` active-round view; SCRUM-69 adds the History tab, the results view of `[id]` (feedback, summary, source labels, disclaimer) and resume/expiry handling.
- Web has no unit test runner (only `test:e2e`); every AC is proven by a Playwright test. No second test framework is added.

## Constitution Check

- I. Shared Contracts First: pass. Web validates responses with the existing shared schemas; no DTO is redefined.
- II. Layered Modular Monolith: pass. Web only; the API is untouched.
- III. Secure by Default: pass. Candidate-only pages; the API keeps ownership checks; no recruiter view; no new env or secret.
- IV. Tested Business Logic: pass, with the Wave delivery exception. One Playwright spec per ticket, one `test()` per AC.
- V. Safe Data Evolution: pass. No data change.
- VI. Simplicity and Pinned Dependencies: pass. No new dependency; reuse `ui/` components and design tokens.

## SCRUM-68 — Replace the mock interview demo with text-only practice

### User story

As a candidate, I want to choose a published job and practice its supported interview rounds in the web app, so that I can rehearse before or after applying and resume saved answers.

### Acceptance criteria

- AC1: A candidate picks a PUBLISHED job (from the job link or the list) and starts the full supported workflow or a single supported round, with or without having applied.
- AC2: Start is blocked until separate interview-answer consent is given; a job without a description or process shows the API error with no fallback content.
- AC3: Group/practical (non-ONLINE/PHONE) rounds are informational only; each interactive round shows exactly five text questions and no timer, voice or video.
- AC4: Answers are saved through the API and survive a reload; the active round resumes from the URL.
- AC5: No numeric score, percentile, rank, pass/fail or recruiter-facing result is rendered, and no static mock session remains (mock files removed).
- AC6 (gates): `pn typecheck`, `pn lint`, `pn test`, `pn format:check`, `pn build` and Playwright pass on the head commit. Size reported, not capped (Wave delivery).

### Files

- Create: `apps/web/src/lib/api/interview-practice.ts`, `apps/web/src/app/(main)/interview-practice/[id]/page.tsx`, `apps/web/src/components/interview-practice/{practice-start,job-picker,round-practice,question-card,source-label}.tsx` (names may adjust), `apps/web/e2e/scrum-68-text-practice.spec.ts`
- Modify: `apps/web/src/app/(main)/interview-practice/page.tsx`, `apps/web/src/components/jobs/job-actions.tsx` (practice link), `apps/web/src/components/layout/site-footer.tsx` (label), `docs/Interview-Practice.md`
- Delete: the mock files listed in Q7 once unimported

### Test cases

| ID | Type | File::test name                                                                 | Proves |
| -- | ---- | ------------------------------------------------------------------------------- | ------ |
| T1 | e2e  | `scrum-68-text-practice.spec.ts::AC1: start full workflow and a single round`   | AC1    |
| T2 | e2e  | `scrum-68-text-practice.spec.ts::AC2: consent is required before start`         | AC2    |
| T3 | e2e  | `scrum-68-text-practice.spec.ts::AC3: informational rounds, five questions, no timer or voice` | AC3 |
| T4 | e2e  | `scrum-68-text-practice.spec.ts::AC4: answers survive a reload`                 | AC4    |
| T5 | e2e  | `scrum-68-text-practice.spec.ts::AC5: no score, rank or verdict and no mock content` | AC5 |
| T6 | e2e  | `scrum-68-text-practice.spec.ts::AC1: usable at 360 px wide`                    | AC1 (mobile) |

## SCRUM-69 — Show interview practice history and feedback

### User story

As a candidate, I want to review completed practice sessions, round feedback and the overall summary, so that I can revisit my preparation without receiving a hiring score.

### Acceptance criteria

- AC1: The signed-in candidate sees completed history (job, rounds) and, per session, question source labels, per-round feedback and the overall summary from API data.
- AC2: Empty, loading and API-error states are usable; history is paginated by the API (10 per page), never unbounded.
- AC3: Incomplete sessions are resumable only within 24 h of inactivity; an expired session shows "no longer available" and no Resume link.
- AC4: No score, percentile, rank, pass/fail or hiring recommendation is shown, and recruiters have no access to the results page.
- AC5: The advisory disclaimer (shared constant) is visible with every feedback and summary.
- AC6 (gates): same as SCRUM-68 AC6.

### Files

- Create: `apps/web/src/components/interview-practice/{practice-history,session-results,round-feedback}.tsx` (names may adjust), `apps/web/e2e/scrum-69-practice-history.spec.ts`
- Modify: `apps/web/src/lib/api/interview-practice.ts` (history call), `apps/web/src/app/(main)/interview-practice/page.tsx` (History tab), `[id]/page.tsx` (results view), `docs/Interview-Practice.md`, `docs/plans/interview-practice-wave-plan.md`

### Test cases

Seed: `candidate1@launchly.test` owns one completed seeded session; `resetPractice` and `expirePractice` reset state; the API runs with `AI_DRIVER=mock`, so tests assert five items, not text.

| ID | Type | File::test name                                                                  | Proves |
| -- | ---- | -------------------------------------------------------------------------------- | ------ |
| T1 | e2e  | `scrum-69-practice-history.spec.ts::AC1: completed session shows rounds, source labels, feedback and summary` | AC1 |
| T2 | e2e  | `scrum-69-practice-history.spec.ts::AC2: empty history, pagination and API error states` | AC2 |
| T3 | e2e  | `scrum-69-practice-history.spec.ts::AC3: resume only within 24 h, expired session is gone` | AC3 |
| T4 | e2e  | `scrum-69-practice-history.spec.ts::AC4: no score or verdict, recruiter and other candidate are blocked` | AC4 |
| T5 | e2e  | `scrum-69-practice-history.spec.ts::AC5: disclaimer shown with feedback and summary` | AC5 |
