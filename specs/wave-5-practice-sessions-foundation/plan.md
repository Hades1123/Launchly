# Wave 5 — Practice sessions foundation

Plan approved by: SƠN NGUYỄN VÕ ĐỨC at the "docs: wave 5 plan" commit (2026-11-13)

Wave plan source: `docs/plans/interview-practice-wave-plan.md` · Branch: `feat/wave-5-practice-sessions-foundation` · Sprint: `SCRUM Sprint 3` (id 4, active, ends 2026-11-14)

## Tickets

| Key      | Title                                          | Label   | Areas       | Depends on | Assignee          |
| -------- | ---------------------------------------------- | ------- | ----------- | ---------- | ----------------- |
| SCRUM-63 | Persist job-linked interview practice sessions | feature | db, shared  | —          | SƠN NGUYỄN VÕ ĐỨC |
| SCRUM-64 | Start and resume interview practice            | feature | api, shared | SCRUM-63   | SƠN NGUYỄN VÕ ĐỨC |
| SCRUM-66 | Expire and delete incomplete practice sessions | feature | api         | SCRUM-63   | SƠN NGUYỄN VÕ ĐỨC |

Existing work: none (no branch, PR or local branch carries SCRUM-63, 64 or 66). SCRUM-51 (merged) is the stage metadata source; see Q3.

## Clarifications

| #   | Ticket | Question                            | Answer                                                                                                                                                                                                                                                                                                                                                                                                                                               | Source                                    |
| --- | ------ | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Q1  | all    | Is interview practice in MVP scope? | Yes (default; person confirms at the Step 5 gate)                                                                                                                                                                                                                                                                                                                                                                                                    | plan "Entry gate" (default)               |
| Q2  | all    | Delivery label                      | Add `feature` to SCRUM-63, 64, 66 in the Step 5/6 Jira writes                                                                                                                                                                                                                                                                                                                                                                                        | default                                   |
| Q3  | 63, 64 | What is a supported Q&A round?      | Derived from existing `JobStage.format`: ONLINE and PHONE are interactive; ONSITE, ASSIGNMENT and unknown/null are informational. No `roundType` column; SCRUM-51 stays Done                                                                                                                                                                                                                                                                         | user (2026-11-13), SCRUM-51 comment 10032 |
| Q4  | all    | Spec Kit mode                       | Wave delivery: this plan only; no `specs/002-interview-practice/`                                                                                                                                                                                                                                                                                                                                                                                    | default                                   |
| Q5  | all    | `docs/Interview-Practice.md`        | SCRUM-63 creates it; SCRUM-64 and 66 extend it                                                                                                                                                                                                                                                                                                                                                                                                       | default                                   |
| Q6  | 63     | Schema shape                        | See SCRUM-63 Files. `InterviewSession` gets nullable `applicationId`, `candidateId`, `jobId`, `scope` (`PracticeScope` FULL/ROUND, replaces a session-level `stageId` so deleting a stage cannot change the scope), `interviewConsentAt`, `lastActivityAt`, nullable `expiresAt`, `summary`. New session-owned `InterviewPracticeRound`, `InterviewPracticeQuestion`, `InterviewPracticeAnswer`. Old `InterviewQuestion`/`InterviewAnswer` untouched | default                                   |
| Q7  | 63     | Seed                                | Backfill covers the seeded session; seed data and idempotency test unchanged                                                                                                                                                                                                                                                                                                                                                                         | default                                   |
| Q8  | 64     | Routes                              | `/candidates/me/interview-practice`: `POST /` start, `GET /:id` resume, `GET /` history (inherits candidate-only guard)                                                                                                                                                                                                                                                                                                                              | default                                   |
| Q9  | 64     | Start rules                         | Published job only (else 404). Blank description, no stages or no interactive round, or selected stage not interactive → 400 `VALIDATION_ERROR` via `AppError` (no fallback). Existing unexpired active session for same candidate/job/scope is returned (200) instead of a duplicate                                                                                                                                                                | default                                   |
| Q10 | 64     | Resume and the clock                | Resume resets `expiresAt` to now + 24 h; answer saving (a later wave) calls the same `touchSession`                                                                                                                                                                                                                                                                                                                                                  | default                                   |
| Q11 | 66     | Cleanup runner                      | `startPracticeCleanup()` started from `server.ts`: sweep at startup, then hourly `setInterval().unref()`. Batches of 100 until drained, idempotent, logs counts only. Disabled when `PRACTICE_CLEANUP_ENABLED=false` (default true)                                                                                                                                                                                                                  | default                                   |
| Q12 | all    | Tests / e2e                         | DB tests are `*.integration.test.ts` gated by `RUN_DB_TESTS=1`. No `apps/web` change → e2e "not applicable: no apps/web diff"                                                                                                                                                                                                                                                                                                                        | default                                   |
| Q13 | all    | Coverage gate                       | `pnpm coverage:changed` does not exist → recorded `not available`                                                                                                                                                                                                                                                                                                                                                                                    | default                                   |

Plan note on "mode of 24 h": the ticket's draft assumption (clock resets after last activity) is adopted as stated.

## Cross-ticket changes

- One combined migration `apps/api/prisma/migrations/20261113120000_interview_practice_sessions/` (SCRUM-63 only; 64 and 66 add no schema).
- `packages/shared/src/index.ts`: SCRUM-63 adds the exports; SCRUM-64 appends its schema export.
- `docs/Interview-Practice.md`: created by 63, extended by 64 and 66.
- Build order: 63 (model and constants every other ticket reads) → 64 (module and DTOs) → 66 (cleanup uses `expiresAt` and the service's expiry rule).

## Constitution Check

- I. Shared Contracts First: pass. Constants, enums, DTOs and request schemas are Zod in `packages/shared`; no Prisma types leave the API.
- II. Layered Modular Monolith: pass. `modules/interview-practice/` route → controller → service → Prisma; cleanup runner in the same module, started from `server.ts`.
- III. Secure by Default: pass. Candidate-only router guard; every session read filters by `candidateId`; expired sessions inaccessible at request time; logs carry counts, never answers.
- IV. Tested Business Logic: pass with Wave delivery exception (minimal plan, agent review). TDD per ticket; coverage gate recorded `not available`.
- V. Safe Data Evolution: pass. Forward-only migration with backfill; no committed migration edited; no reset or `db push`.
- VI. Simplicity and Pinned Dependencies: pass. No new dependency; no `roundType` column; timer is `setInterval`.

## SCRUM-63 — Persist job-linked interview practice sessions

### User story

As a candidate, I want my practice sessions saved against a published job, so that I can practice before or after applying and return to my saved work.

### Acceptance criteria

- AC1: A candidate-owned practice session references a job and permits a null application link.
- AC2: Existing application-linked interview rows survive the migration and are backfilled (candidate, job) without data loss.
- AC3: Generated questions, their source labels, text answers, round progress, consent, feedback, status and expiry persist and reload.
- AC4: Generated practice questions do not become recruiter-authored `InterviewQuestion` records.
- AC5: Focused DB test and `pnpm typecheck`, `lint`, `test` pass on the final revision; RED and GREEN kept as PR evidence.
- AC6: Schema, tests and `docs/Interview-Practice.md` agree (the wave plan replaces the Spec Kit artifacts).
- AC7: Handwritten diff ≤ 300 lines (`git diff --stat`, excluding generated files, migration SQL and tests' fixtures noted in the PR).

### Files

- Create: `apps/api/prisma/migrations/20261113120000_interview_practice_sessions/migration.sql`
- Create: `apps/api/prisma/interview-practice-schema.integration.test.ts`
- Create: `packages/shared/src/constants/interview-practice.ts` (`PRACTICE_QUESTIONS_PER_ROUND = 5`, `PRACTICE_EXPIRY_HOURS = 24`, `INTERACTIVE_ROUND_FORMATS = ['ONLINE','PHONE']`, `isInteractiveRoundFormat`)
- Create: `packages/shared/src/constants/interview-practice.test.ts`
- Create: `docs/Interview-Practice.md`
- Modify: `apps/api/prisma/schema.prisma`, `apps/api/prisma/seed/data.ts` (the seeded session needs `candidateId` and `jobId`)
- Modify: `packages/shared/src/index.ts`

### Test cases

| ID  | Type        | File::test name                                                                                                 | Proves   |
| --- | ----------- | --------------------------------------------------------------------------------------------------------------- | -------- |
| T1  | integration | `apps/api/prisma/interview-practice-schema.integration.test.ts::allows a session with a job and no application` | AC1      |
| T2  | integration | `…::keeps a legacy application-linked session and backfills candidate and job`                                  | AC2      |
| T3  | integration | `…::round-trips rounds, questions with source, answers, feedback, consent, status and expiry`                   | AC3      |
| T4  | integration | `…::deleting a session cascades rounds, questions and answers`                                                  | AC3      |
| T5  | integration | `…::generated questions create no InterviewQuestion rows`                                                       | AC4      |
| T6  | unit        | `packages/shared/src/constants/interview-practice.test.ts::only ONLINE and PHONE are interactive`               | Q3       |
| T7  | process     | final-head `pnpm typecheck`, `pnpm lint`, `pnpm test`, `git diff --stat`, RED/GREEN notes in PR                 | AC5, AC7 |
| T8  | doc         | review checks `docs/Interview-Practice.md` fields match the migration                                           | AC6      |

The migration test builds the legacy row by running the migration on a database at the previous migration, using the same approach as `job-level-migration.integration.test.ts`.

## SCRUM-64 — Start and resume interview practice

### User story

As a candidate, I want to start practice for a published job and resume my own session, so that I can practice before or after applying without losing progress.

### Acceptance criteria

- AC1: An authenticated candidate can start a PUBLISHED-job session without an application and choose the full workflow or one interactive round.
- AC2: Start requires explicit interview consent (`consent: true`, separate from CV consent) and blocks missing job description or process data with no fallback.
- AC3: A non-interactive (ONSITE, ASSIGNMENT, unset) round, or a full workflow with no interactive round, does not start.
- AC4: Only the owning candidate can resume a session; saved state returns within 24 h after last activity; expired sessions are inaccessible (404).
- AC5: History is newest-first, paginated by `page`/`limit` (default 1/10, max 50), has no answer bodies and never includes another candidate's data.
- AC6: Request and response contracts are shared Zod schemas; all failures use the standard error shape.
- AC7: Local checks pass on the final revision; RED/GREEN kept; handwritten diff ≤ 300 lines.

### Files

- Create: `packages/shared/src/schemas/interview-practice.ts` and `.test.ts` (start body `{ jobId, consent: true, stageId? }`, session DTO, history item DTO, history query)
- Create: `apps/api/src/modules/interview-practice/interview-practice.routes.ts`, `.controller.ts`, `.service.ts`, `.test.ts`
- Modify: `apps/api/src/app.ts` (mount `/candidates/me/interview-practice` ahead of `/candidates`; the router has its own candidate-only guard, so `candidate.routes.ts` is unchanged)
- Modify: `packages/shared/src/index.ts`, `docs/Interview-Practice.md`

### Test cases

| ID  | Type        | File::test name                                                                                    | Proves   |
| --- | ----------- | -------------------------------------------------------------------------------------------------- | -------- |
| T1  | unit        | `shared/src/schemas/interview-practice.test.ts::start body requires consent true and a uuid jobId` | AC2, AC6 |
| T2  | unit        | `…::history query defaults to page 1 limit 10 and rejects limit above 50`                          | AC5      |
| T3  | integration | `interview-practice.test.ts::starts a full-workflow session without an application (201)`          | AC1      |
| T4  | integration | `…::starts a single interactive round`                                                             | AC1      |
| T5  | integration | `…::rejects start without consent and creates no session`                                          | AC2      |
| T6  | integration | `…::rejects an unpublished job (404) and a blank-description job`                                  | AC2      |
| T7  | integration | `…::rejects an ONSITE round and a workflow with no interactive round`                              | AC3      |
| T8  | integration | `…::returns 401 unauthenticated and 403 for a non-candidate`                                       | AC6      |
| T9  | integration | `…::owner resumes saved progress and the 24 h clock resets`                                        | AC4      |
| T10 | integration | `…::another candidate gets 404 for the session`                                                    | AC4      |
| T11 | integration | `…::an expired session returns 404`                                                                | AC4      |
| T12 | integration | `…::history is newest-first, paginated, own data only, without answers`                            | AC5      |
| T13 | integration | `…::empty history and page beyond the end`                                                         | AC5      |
| T14 | integration | `…::returns the existing active session instead of a duplicate`                                    | Q9       |

Route tests use supertest on `createApp()` with the mocked-Prisma style of the other module tests (`assessment.test.ts`), so they run without a database.

## SCRUM-66 — Expire and delete incomplete practice sessions

### User story

As a candidate, I want incomplete practice data deleted after 24 hours without activity, so that saved interview answers are not retained indefinitely.

### Acceptance criteria

- AC1: Incomplete sessions expire 24 h after last activity; resume is blocked after expiry even before deletion.
- AC2: Cleanup runs at startup and hourly while the API is healthy; expired incomplete sessions and their rounds, questions and answers are permanently deleted.
- AC3: Startup catches up overdue sessions; completed sessions are never deleted; legacy sessions with null `expiresAt` are never deleted.
- AC4: Cleanup is idempotent, bounded in batches, uses the `expiresAt` index and logs counts only.
- AC5: Fake-clock and real-DB tests plus final-revision checks pass; RED/GREEN kept.
- AC6: `docs/Interview-Practice.md` documents the guarantee and the process-down limitation.
- AC7: Handwritten diff ≤ 300 lines.

### Files

- Create: `apps/api/src/modules/interview-practice/interview-practice.cleanup.ts`, `.cleanup.test.ts` (fake timers, mocked Prisma), `.cleanup.integration.test.ts` (real DB)
- Modify: `apps/api/src/server.ts` (start the runner and stop it on `SIGTERM`), `apps/api/src/lib/env.ts` (`PRACTICE_CLEANUP_ENABLED`), `apps/api/src/modules/interview-practice/interview-practice.service.ts` (expiry helper shared with SCRUM-64's resume), `docs/Interview-Practice.md`
- Modify: `apps/api/.env.example` if present (document the flag)

### Test cases

| ID  | Type        | File::test name                                                                                                      | Proves   |
| --- | ----------- | -------------------------------------------------------------------------------------------------------------------- | -------- |
| T1  | unit        | `cleanup.test.ts::sets expiresAt to now + 24 h on touch`                                                             | AC1      |
| T2  | unit        | `…::runs a sweep at start and then every hour`                                                                       | AC2      |
| T3  | unit        | `…::stop clears the timer and start twice schedules once`                                                            | AC2, AC4 |
| T4  | unit        | `…::drains the backlog in batches of 100 without one query per session`                                              | AC4      |
| T5  | unit        | `…::logs only counts and surfaces a database failure`                                                                | AC4      |
| T6  | integration | `cleanup.integration.test.ts::deletes expired incomplete sessions with rounds, questions, answers`                   | AC2      |
| T7  | integration | `…::keeps completed sessions and legacy rows with null expiresAt at the same deadline`                               | AC3      |
| T8  | integration | `…::catches up overdue sessions on the first sweep and a second run changes nothing`                                 | AC3, AC4 |
| T9  | integration | `interview-practice.test.ts::expired session is not resumable before the next sweep` (added by 64, re-asserted here) | AC1      |
| T10 | doc         | review checks the guarantee and process-down limitation in `docs/Interview-Practice.md`                              | AC6      |

## Gate record (head `7469018` plus this plan commit)

| Gate                                                                              | Result                                                                                                                                                                                                                                                                                                |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck`                                                                  | `packages/shared` and `apps/api` pass. `apps/web` fails only on a stale git-ignored `apps/web/.next/types` (it points at the removed `src/app/page.tsx`; a dev server is running so the cache was left alone). With `.next` excluded the web typecheck exits 0. This diff touches no `apps/web` file. |
| `pnpm lint`                                                                       | pass (exit 0)                                                                                                                                                                                                                                                                                         |
| `pnpm test`                                                                       | pass: shared 101, api 327 passed, 87 DB-gated skipped                                                                                                                                                                                                                                                 |
| DB integration tests (`RUN_DB_TESTS=1`, `launchly_test`, `--no-file-parallelism`) | pass: 41 files, 353 tests (includes the three new DB test files and the seed idempotency test). The untracked `job.search.integration.test.ts` in the working tree is not part of this branch; it has 34 failures against the shared test database and was excluded.                                  |
| format (`prettier --check` on changed files)                                      | pass; `schema.prisma` and `migration.sql` have no prettier parser                                                                                                                                                                                                                                     |
| coverage                                                                          | not available: `coverage:changed` missing from root `package.json`                                                                                                                                                                                                                                    |
| e2e                                                                               | not applicable: no `apps/web` diff                                                                                                                                                                                                                                                                    |
| handwritten diff size                                                             | over the tickets' 300-line target: SCRUM-63 about 155, SCRUM-64 about 430 (module 271 service lines), SCRUM-66 about 130, excluding tests, migration SQL and the plan. Reported, not split, under Wave delivery.                                                                                      |
| agent review                                                                      | pending                                                                                                                                                                                                                                                                                               |
