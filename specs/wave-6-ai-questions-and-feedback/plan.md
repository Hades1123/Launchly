# Wave 6 — AI questions and feedback

Plan approved by: user (SƠN NGUYỄN VÕ ĐỨC) at a02e7bf (2026-11-14)

Wave plan source: `docs/plans/interview-practice-wave-plan.md` · Branch: `feat/wave-6-ai-questions-and-feedback` · Sprint: `SCRUM Sprint 3`

## Tickets

| Key      | Title                                                   | Label   | Areas      | Depends on           | Assignee  |
| -------- | ------------------------------------------------------- | ------- | ---------- | -------------------- | --------- |
| SCRUM-65 | Generate and save text-only practice rounds             | feature | api, shared | SCRUM-63, SCRUM-64   | DŨNG NGUYỄN PHẠM MẠNH |
| SCRUM-67 | Generate round feedback and an overall practice summary | feature | api, shared, db | SCRUM-64, SCRUM-65 | SƠN NGUYỄN VÕ ĐỨC |

## Clarifications

All answered "defaults" by the user.

| #   | Ticket   | Question | Answer | Source |
| --- | -------- | -------- | ------ | ------ |
| Q1  | SCRUM-65 | Prompt inputs | Only job title, description, requirements, round name and format. Never CV, profile or application. | user (default) |
| Q2  | SCRUM-65 | Source labels | Fixed enum `practiceQuestionSourceSchema` in `@launchly/shared`: `JOB_DESCRIPTION`, `JOB_REQUIREMENTS`, `ROUND_PROCESS`; the model picks one per question, the schema validates it. | user (default) |
| Q3  | SCRUM-67 | Feedback storage | Validated JSON text in existing `feedback` (answer, round) and `summary` columns, parsed with the shared schema on read. Only migration drops `InterviewPracticeAnswer.score`. | user (default) |
| Q4  | SCRUM-67 | Disclaimer | Shared constant `PRACTICE_FEEDBACK_DISCLAIMER` = "AI-generated practice feedback is advisory and may be incorrect; it does not affect hiring decisions." (exact text from SCRUM-69), returned inside the feedback and summary DTOs. | user (default); SCRUM-69 Jira |
| Q5  | SCRUM-67 | Feedback timing | Allowed only when all five answers of the round are saved, else `400 VALIDATION_ERROR`. | user (default) |
| Q6  | both     | Provider failure | Nothing stored; same call can be repeated and still counts toward the limiter. | user (default) |
| Q7  | both     | Timeout helper | Move `withTimeout` and `AI_TIMEOUT_MS` (30 000) from `assessment.service.ts` to `providers/ai`; both services use it. | user (default) |
| Q8  | both     | Labels | Add `feature` to both tickets at the Step 5 gate. | user (default) |
| Q9  | both     | Plan doc | Branch cut from `origin/main`; docs commit `fb93362` cherry-picked so the wave plan doc rides in this PR. | user (default); memory |

## Cross-ticket changes

- Shared files: `packages/shared/src/schemas/interview-practice.ts`, `packages/shared/src/constants/interview-practice.ts`, `apps/api/src/modules/interview-practice/{service,controller,routes,test}`, `docs/Interview-Practice.md`.
- One migration (SCRUM-67): drop `InterviewPracticeAnswer.score`. No schema change for SCRUM-65. Legacy `InterviewAnswer.score` untouched.
- Build order: (1) shared schemas/constants and `providers/ai` timeout helper (assessment service switched to it, its tests stay green); (2) shared `interviewAiRateLimit` middleware; (3) SCRUM-65; (4) SCRUM-67, which reuses SCRUM-65's round/answer queries, limiter and AI call wrapper.
- Limiter: `express-rate-limit`, 10 per 60 s, key = authenticated user id (candidate), one instance applied to both AI routes (`POST …/questions`, `POST …/feedback`), message `RATE_LIMITED`. Process-local; documented.

## Constitution Check

- I. Shared Contracts First: pass. Question/feedback/summary schemas, source enum, disclaimer constant live in `@launchly/shared`; API validates AI output with them; no Prisma types leave the API.
- II. Layered Modular Monolith: pass. Route → controller → service → Prisma in `modules/interview-practice`; AI only through `providers/ai`.
- III. Secure by Default: pass. Candidate-only routes, ownership + consent + expiry checked per call, no recruiter route, no prompts/answers logged.
- IV. Tested Business Logic: pass. TDD with the mock AI driver, supertest endpoints, no network. Coverage ≥80 % lines and branches on changed files (method: package `coverage-summary.json`, since `coverage:changed` is absent).
- V. Safe Data Evolution: pass. One new forward migration; committed migrations untouched.
- VI. Simplicity and Pinned Dependencies: pass. No new dependency (`express-rate-limit` exists).

## SCRUM-65 — Generate and save text-only practice rounds

### User story

As a candidate, I want five job-specific written questions in each supported practice round and to save my written answers, so that I can rehearse without voice, video, or a timer.

### Acceptance criteria

- AC1: Every supported interactive round (format ONLINE/PHONE) gets exactly five generated text questions, each with a source label.
- AC2: Questions and answers persist and reload for the owning candidate; repeated generation for a round returns the stored set (no second AI call, no duplicates) and never erases saved answers.
- AC3: Missing job description/process data, missing interview consent, unsupported (non-interactive) round, malformed provider output and provider timeout fail explicitly (400/403/404/503) with nothing stored and no generic fallback.
- AC4: Question and feedback routes share one per-candidate limit of 10 requests per 60 s; the 11th returns 429 `RATE_LIMITED` in the standard error shape.
- AC5: No voice/video, timer, score, or recruiter access is added (candidate-only routes; DTOs carry text only).
- AC6: Mock-driver unit/HTTP tests and all final-revision gates pass.

### Files

- Create: `apps/api/src/middlewares/interview-ai-rate-limit.ts`, `apps/api/src/providers/ai/with-timeout.ts` (moved helper + test in `ai.provider.test.ts`)
- Modify: `packages/shared/src/schemas/interview-practice.ts` (+test), `packages/shared/src/constants/interview-practice.ts` (+test), `apps/api/src/providers/ai/index.ts`, `apps/api/src/modules/assessment/assessment.service.ts`, `apps/api/src/modules/interview-practice/interview-practice.{service,controller,routes}.ts`, `apps/api/src/modules/interview-practice/interview-practice.test.ts`, `apps/api/src/app.ts` (inject AI provider/limiter if needed), `docs/Interview-Practice.md`

### Test cases

| ID  | Type | File::test name | Proves |
| --- | ---- | --------------- | ------ |
| T1  | unit | `packages/shared/src/schemas/interview-practice.test.ts::generated questions schema requires exactly five with a known source` | AC1 |
| T2  | unit | `apps/api/src/providers/ai/ai.provider.test.ts::withTimeout rejects with AI_UNAVAILABLE after the limit` | AC3 |
| T3  | integration | `interview-practice.test.ts::POST questions stores five questions with source labels` | AC1 |
| T4  | integration | `interview-practice.test.ts::POST questions twice returns the same set and calls the AI once` | AC2 |
| T5  | integration | `interview-practice.test.ts::regenerating keeps saved answers` | AC2 |
| T6  | integration | `interview-practice.test.ts::PUT answer saves, updates and reloads via GET session` | AC2 |
| T7  | integration | `interview-practice.test.ts::provider failure stores nothing and a retry succeeds` | AC2, AC3 |
| T8  | integration | `interview-practice.test.ts::malformed AI output is 503 and not stored` | AC3 |
| T9  | integration | `interview-practice.test.ts::provider timeout is AI_UNAVAILABLE` | AC3 |
| T10 | integration | `interview-practice.test.ts::missing description or consent or non-interactive round makes no AI call` | AC3 |
| T11 | integration | `interview-practice.test.ts::wrong owner, recruiter and unauthenticated callers are rejected` | AC5 |
| T12 | integration | `interview-practice.test.ts::11th AI request in a minute is 429 RATE_LIMITED` | AC4 |
| T13 | integration | `interview-practice.test.ts::responses contain no score and only text fields` | AC5 |
| T14 | gate | `pnpm typecheck && pnpm lint && pnpm test && test:coverage` | AC6 |

No e2e: no `apps/web` change (web UI is Wave 7).

## SCRUM-67 — Generate round feedback and an overall practice summary

### User story

As a candidate, I want feedback after each completed practice round and an overall summary after the full workflow, so that I can improve without receiving a hiring score or decision.

### Acceptance criteria

- AC1: A completed interactive round (all five answers saved) gets persisted, candidate-visible advisory feedback; completing the last selected round stores the overall summary and completes the session.
- AC2: Feedback and summary are runtime-schema validated and idempotent (a repeat returns stored feedback, no AI call); invalid AI output is an explicit error and nothing is stored.
- AC3: Responses contain no numeric score, percentile, rank, pass/fail or hiring recommendation; `score` is removed from the DTO and dropped from `InterviewPracticeAnswer`.
- AC4: Feedback calls share the question-generation limiter (same counter), 11th request in 60 s is 429.
- AC5: Only the owning candidate can read results; no recruiter route exposes practice data; each DTO carries `PRACTICE_FEEDBACK_DISCLAIMER`.
- AC6: Tests and all final-revision gates pass.

### Files

- Create: `apps/api/prisma/migrations/<ts>_drop_practice_answer_score/migration.sql`
- Modify: `apps/api/prisma/schema.prisma`, `packages/shared/src/schemas/interview-practice.ts` (+test), `packages/shared/src/constants/interview-practice.ts`, `apps/api/src/modules/interview-practice/interview-practice.{service,controller,routes}.ts`, `interview-practice.test.ts`, `apps/api/prisma/interview-practice-schema.integration.test.ts` (if it references `score`), `docs/Interview-Practice.md`

### Test cases

| ID  | Type | File::test name | Proves |
| --- | ---- | --------------- | ------ |
| T15 | unit | `packages/shared/src/schemas/interview-practice.test.ts::feedback and summary schemas carry the disclaimer and no score fields` | AC3, AC5 |
| T16 | integration | `interview-practice.test.ts::POST feedback with five answers stores feedback and completes the round` | AC1 |
| T17 | integration | `interview-practice.test.ts::last round feedback stores the summary and completes the session` | AC1 |
| T18 | integration | `interview-practice.test.ts::summary absent while a selected round is incomplete` | AC1 |
| T19 | integration | `interview-practice.test.ts::feedback with fewer than five answers is 400` | AC1 |
| T20 | integration | `interview-practice.test.ts::repeat feedback returns stored result without an AI call` | AC2 |
| T21 | integration | `interview-practice.test.ts::malformed AI feedback is 503 and nothing is stored` | AC2 |
| T22 | integration | `interview-practice.test.ts::feedback and question calls share one limiter counter` | AC4 |
| T23 | integration | `interview-practice.test.ts::no score, rank or verdict in any response; other candidate and recruiter denied` | AC3, AC5 |
| T24 | db (gated) | `apps/api/prisma/interview-practice-schema.integration.test.ts::practice answer has no score column` | AC3 |
| T25 | gate | `pnpm typecheck && pnpm lint && pnpm test && test:coverage`; `pnpm db:migrate` clean | AC6 |

No e2e: no `apps/web` change.
