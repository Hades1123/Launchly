# Wave 1 — Foundations

Plan approved by: the user who ran the skill, against origin/main 7365b64 (2026-11-12). SCRUM-47 moved to Wave 2 on request.

Wave plan source: `docs/plans/mvp-wave-plan.md` · Branch: `feat/wave-1-foundations` · Sprint: `SCRUM Sprint 3` (id 4, active)

## Tickets

Build order. Assignees for SCRUM-41 and SCRUM-29 are kept (already assigned); the rest were filled by `assign.mjs` over the six-person team pool.

| Key      | Title                                                    | Label       | Areas                | Depends on         | Assignee                |
| -------- | -------------------------------------------------------- | ----------- | -------------------- | ------------------ | ----------------------- |
| SCRUM-46 | Set up Playwright e2e with a smoke test                  | maintenance | web                  | —                  | SƠN NGUYỄN VÕ ĐỨC       |
| SCRUM-41 | Process rounds builder for job postings                  | feature     | shared, api, web, db | —                  | SĨ LÊ NGUYỄN VĂN (kept) |
| SCRUM-29 | View hiring process and company notes                    | feature     | api, shared, web, db | SCRUM-41           | VINH NÔNG THẾ (kept)    |
| SCRUM-51 | Show format and duration for each hiring round (reduced) | feature     | api, shared, web     | SCRUM-41, SCRUM-29 | DŨNG NGUYỄN PHẠM MẠNH   |
| SCRUM-48 | Candidate applies to a job via API                       | feature     | api, shared, db      | —                  | VINH NÔNG THẾ           |
| SCRUM-49 | Swappable AI provider with mock and Gemini drivers       | feature     | api, shared          | —                  | QUÝ PHẠM DUY            |
| SCRUM-50 | Extract text from uploaded PDF CVs                       | feature     | api                  | —                  | VĂN NGUYỄN THIÊN        |

## Clarifications

| #   | Ticket     | Question                                   | Answer                                                                                                                                                                                                                                                            | Source                                             |
| --- | ---------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Q1  | 41, 51, 29 | Which names for round format and duration? | SCRUM-41's: `format` (ONLINE, ONSITE, PHONE, ASSIGNMENT) and `estimatedDurationMinutes`. SCRUM-51 shrinks to exposing and proving them; no `mode` or `roundType` columns. (default)                                                                               | user: defaults                                     |
| Q2  | 29         | What does SCRUM-29 deliver in this wave?   | `JobNote` model + seed, notes and round format/duration in the public detail API, timeline and notes components. The page is SCRUM-53; the UI e2e for it moves to SCRUM-53. (default)                                                                             | user: defaults                                     |
| Q3  | 29         | UI language?                               | English strings inline (project config), not the Vietnamese copy in the SCRUM-29 spec. (default)                                                                                                                                                                  | user: defaults                                     |
| Q4  | 29         | Notes storage vs SCRUM-26?                 | `JobNote(content, position)`; the 5-note limit stays in SCRUM-26's write validation, whose notes subtask reuses this table. The user tells the SCRUM-26 assignee. (default)                                                                                       | user: defaults                                     |
| Q5  | 41         | How to reuse the local commits?            | Rebase the 10 commits of `feat/SCRUM-41-process-rounds-builder` onto `origin/main`; fold its migration into the single wave migration; keep `specs/003-process-rounds-builder/`. (default)                                                                        | user: defaults                                     |
| Q6  | 49         | Which real AI driver?                      | **Gemini** (`AI_DRIVER=mock\|gemini`, `GEMINI_API_KEY`), called with `fetch`, no SDK. The Jira text says Anthropic and is edited at approval.                                                                                                                     | user                                               |
| Q7  | 50         | New PDF dependency?                        | Yes: `unpdf` 2.1.0 (MIT, pure JS, no build script). Reason (Principle VI): nothing on `main` reads PDFs.                                                                                                                                                          | user; `npm view unpdf`                             |
| Q8  | 46         | Which database does e2e use?               | The local dev database via `pnpm db:up`, `db:migrate`, `db:seed`.                                                                                                                                                                                                 | design doc                                         |
| Q9  | 29, 41     | `feature` label missing on both?           | Yes, add `feature` (Jira edit at approval).                                                                                                                                                                                                                       | Jira                                               |
| Q11 | 47, 29     | Does SCRUM-47 block anything in this wave? | No. Its only link to SCRUM-29 was an assumption (Jira lists none). SCRUM-29 returns the ordered stages itself; SCRUM-47 moves to Wave 2, where SCRUM-53 needs it. SCRUM-41 does block SCRUM-29 (schema columns) and SCRUM-51 (builder and save API), so it stays. | user, dependency check                             |
| Q10 | 49         | Error code for AI timeout/vendor failure?  | Add `AI_UNAVAILABLE` (HTTP 503) to the shared `ErrorCode` set. (my call)                                                                                                                                                                                          | `packages/shared`, `apps/api/src/lib/app-error.ts` |

## Cross-ticket changes

- **One migration** `apps/api/prisma/migrations/20261112090000_wave1_rounds_notes_cover_letter/` holds: `JobStage.format String?`, `JobStage.estimatedDurationMinutes Int?` (SCRUM-41), `JobNote` table (SCRUM-29), `Application.coverLetter String?` (SCRUM-48). SCRUM-41's own migration `20261107120000_job_round_format_and_duration` is removed during the rebase (it is not on `main`; its timestamp also collides with `20261107120000_job_salary_hidden`). It is committed with SCRUM-41 and named in that commit message together with SCRUM-29 and SCRUM-48.
- **Shared files touched by several tickets:** `packages/shared/src/schemas/job.ts` (29 → 51), `schemas/job-round.ts` (41 → 51), `index.ts` (41, 29, 48), `apps/api/src/app.ts` (41 mounts `/jobs/:id/rounds`, 48 mounts `/applications`; one trivial conflict resolved during the SCRUM-41 rebase), `job.service.ts` (29), `apps/api/prisma/seed/data.ts` (29, 41).
- **Build order:** SCRUM-46 (tooling, so e2e applies to the web tickets) → SCRUM-41 (rebase + the wave migration) → SCRUM-29 (needs 41) → SCRUM-51 (needs 41 and 29) → SCRUM-48 → SCRUM-49 → SCRUM-50. SCRUM-47 is not in this wave (moved to Wave 2).
- **Gates:** `pnpm typecheck`, `pnpm lint`, `pnpm test`; coverage gate is **not available** (no `test:coverage` / `coverage:changed` scripts); e2e runs after SCRUM-46 exists.
- **New dependencies:** `@playwright/test` (devDependency, `apps/web`, SCRUM-46), `unpdf` (`apps/api`, SCRUM-50). Neither has build scripts, so `allowBuilds` is unchanged.

## Constitution Check

- I. Shared Contracts First: pass. Request/response shapes for rounds, public detail (stages, notes), applications and the `AI_UNAVAILABLE` code live in `packages/shared`; Prisma types never reach the web app.
- II. Layered Modular Monolith: pass. New code follows route → controller → service → Prisma in `modules/application`; AI provider sits in `providers/ai` behind an interface chosen by `AI_DRIVER` (same pattern as storage and mail).
- III. Secure by Default: pass. `POST /applications` requires `authenticate` + `authorize('CANDIDATE')` and checks resume ownership; public detail keeps `publicJobWhere` and the salary rule; the Gemini key is read only from env and never logged or returned.
- IV. Tested Business Logic: pass with one recorded gap. Every AC maps to a test below; coverage tooling does not exist, reported as not available. `apps/web` has no unit-test runner, so web logic is extracted into tested pure helpers in `packages/shared` and web UI is covered by Playwright where a page exists.
- V. Safe Data Evolution: pass. One additive migration (nullable columns, new table), no edits to committed migrations.
- VI. Simplicity and Pinned Dependencies: pass. Two new dependencies, each with a stated reason; Gemini is called with `fetch`, no SDK.

## SCRUM-46 — Set up Playwright e2e with a smoke test

### User story

As a developer on the Launchly team, I want an end-to-end test setup for the web app, so that every web ticket can prove its user flow works before review.

### Acceptance criteria

- AC1: `pnpm --filter @launchly/web test:e2e` passes on a fresh clone after `db:up`, `db:migrate`, `db:seed`.
- AC2: the smoke test covers the jobs list and candidate login.

### Files

- Create: `apps/web/playwright.config.ts` (Chromium only; `webServer` entries start the API on 4100 and the web app on 3100 with `node` directly and `reuseExistingServer: false`, so a dev server or another project on 3000/4000 is never tested by mistake), `apps/web/e2e/helpers/auth.ts`, `apps/web/e2e/smoke.spec.ts`
- Modify: `apps/web/package.json` (script `test:e2e`, devDependency `@playwright/test`), `.gitignore` (`playwright-report/`, `test-results/`), `README.md` (short "Running e2e locally" section), `pnpm-lock.yaml`

### Test cases

| ID  | Type | File::test name                                                 | Proves   |
| --- | ---- | --------------------------------------------------------------- | -------- |
| T1  | e2e  | `apps/web/e2e/smoke.spec.ts::AC2: jobs list shows seeded jobs`  | AC1, AC2 |
| T2  | e2e  | `apps/web/e2e/smoke.spec.ts::AC2: seeded candidate can sign in` | AC1, AC2 |

## SCRUM-41 — Process rounds builder for job postings

### User story

As a recruiter, I want to build the ordered list of hiring rounds for my job (name, format, estimated duration), so that candidates see how the process works. (Jira has no user story; derived from its description and the existing spec `specs/003-process-rounds-builder/`.)

### Acceptance criteria

- AC1: a recruiter who owns the job can add, reorder and delete rounds; array order becomes `position` 1..n.
- AC2: each round stores name (1–100 chars), format (ONLINE, ONSITE, PHONE, ASSIGNMENT) and estimated duration (integer 5–480 minutes).
- AC3: invalid or missing required fields are rejected on submit (400) and flagged in the UI; 0–10 rounds.
- AC4: only the job's owning recruiter can read or replace rounds (others 403/404).
- AC5: a round used by an application cannot be removed; concurrent saves are serialised.

### Files

- Reuse from branch (rebased): `apps/api/src/modules/job/job-rounds.{controller,routes,service}.ts`, `job-rounds.test.ts`, `job-rounds.integration.test.ts`, `packages/shared/src/schemas/job-round.ts` (+ test), `apps/web/src/app/recruiter/jobs/[id]/rounds/page.tsx`, `apps/web/src/components/recruiter/rounds-builder.tsx`, `specs/003-process-rounds-builder/`
- Modify: `apps/api/prisma/schema.prisma`, `apps/api/src/app.ts`, `packages/shared/src/index.ts`
- Create: wave migration (see Cross-ticket changes), `apps/web/e2e/scrum-41-rounds-builder.spec.ts`

### Test cases

| ID  | Type        | File::test name                                                                                          | Proves   |
| --- | ----------- | -------------------------------------------------------------------------------------------------------- | -------- |
| T1  | unit        | `packages/shared/src/schemas/job-round.test.ts` (existing: field bounds, 0–10 rounds)                    | AC2, AC3 |
| T2  | integration | `apps/api/src/modules/job/job-rounds.test.ts` (existing: GET/PUT, ownership, 400)                        | AC1–AC4  |
| T3  | integration | `apps/api/src/modules/job/job-rounds.integration.test.ts` (existing, `RUN_DB_TESTS=1`)                   | AC1, AC5 |
| T4  | e2e         | `apps/web/e2e/scrum-41-rounds-builder.spec.ts::AC1: recruiter adds a round and it persists after reload` | AC1, AC2 |
| T5  | e2e         | `apps/web/e2e/scrum-41-rounds-builder.spec.ts::AC3: empty round name shows a validation error`           | AC3      |

## SCRUM-29 — View hiring process and company notes

### User story

As a candidate (intern or fresher), I want to see a job's hiring process (each round's name, format and estimated duration) and the notes the company left for applicants, so that I can prepare before I apply. (Scoped per Q2: data, API and components; the page is SCRUM-53.)

### Acceptance criteria

- AC1: the public job detail response includes `stages` ordered by `position`, each with id, name, description, `format` and `estimatedDurationMinutes` (null values omitted from the display, never invented).
- AC2: the response includes the job's notes in `position` order.
- AC3: non-public or unknown jobs return the same 404 body; the response never includes salary internals, `publicationStatus`, `moderationReason` or `createdById`.
- AC4: the timeline component shows rounds in stored order with name, format label and duration; missing format or duration is not rendered.
- AC5: a job with zero rounds shows "Company has not provided the process" and no notes section, even if notes exist.
- AC6: the notes component shows all notes in saved order under "Notes from the company".

### Files

- Create: `JobNote` model (in the wave migration), `packages/shared/src/utils/process-timeline.ts` (+ `.test.ts`; pure helper returning display rows and `showNotes`), `apps/web/src/components/jobs/hiring-process-timeline.tsx`, `apps/web/src/components/jobs/company-notes.tsx`, `apps/api/src/modules/job/job-detail-process.test.ts`
- Modify: `apps/api/prisma/schema.prisma`, `packages/shared/src/schemas/job.ts` (`publicJobStageSchema` with id, name, description, position, `format`, `estimatedDurationMinutes`; `publicJobNoteSchema`; `stages` and `notes` on `publicJobDetailSchema`), `packages/shared/src/index.ts`, `apps/api/src/modules/job/job.service.ts`, `apps/api/prisma/seed/data.ts` (jobs with process and notes, without process, pending job; stable ids; seed `run.test.ts` stays green)

### Test cases

| ID  | Type        | File::test name                                                                                      | Proves   |
| --- | ----------- | ---------------------------------------------------------------------------------------------------- | -------- |
| T1  | integration | `job-detail-process.test.ts::returns stages ordered by position with format and duration`            | AC1      |
| T2  | integration | `job-detail-process.test.ts::returns notes ordered by position`                                      | AC2      |
| T3  | integration | `job-detail-process.test.ts::404 body identical for unknown and pending job; no internal fields`     | AC3      |
| T4  | unit        | `packages/shared/src/utils/process-timeline.test.ts::keeps order and omits null format and duration` | AC4      |
| T5  | unit        | `process-timeline.test.ts::no rounds gives empty state and hides notes`                              | AC5      |
| T6  | unit        | `process-timeline.test.ts::notes keep saved order`                                                   | AC6      |
| T7  | unit        | `packages/shared/src/schemas/job.test.ts::stage and note schemas`                                    | AC1, AC2 |

The UI e2e for AC4–AC6 is delivered by SCRUM-53 (Wave 2), where a page renders the components.

## SCRUM-51 — Show format and duration for each hiring round (reduced)

### User story

As a candidate, I want to know each hiring round's format and how long it takes, so that I can arrange my schedule and equipment and prepare in advance. (Reduced per Q1: SCRUM-41 already lets the recruiter set them and SCRUM-29 exposes and renders them; this ticket proves the full path and owns the display labels.)

### Acceptance criteria

- AC1: a recruiter can set format and duration per round and the values persist (SCRUM-41's builder).
- AC2: the candidate-facing data and timeline show them; empty values are hidden, not "null".
- AC3: format values map to readable labels (ONLINE "Online", ONSITE "On-site", PHONE "Phone call", ASSIGNMENT "Take-home assignment") and durations to "<n> min" in one shared place used by the public timeline (the recruiter builder keeps its own Vietnamese labels).

### Files

- Create: `packages/shared/src/constants/job-round-format.ts` (labels, `formatRoundDuration`) + test, `apps/api/src/modules/job/job-rounds-public.integration.test.ts` (`RUN_DB_TESTS=1`)
- Labels and `roundMeta` were created with SCRUM-29's `process-timeline.ts` (needed first); `packages/shared/src/index.ts` exports them. The recruiter builder is unchanged.

### Test cases

| ID  | Type        | File::test name                                                                                                                    | Proves   |
| --- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------- |
| T1  | unit        | `packages/shared/src/constants/job-round-format.test.ts::labels and duration text`                                                 | AC3      |
| T2  | integration | `job-rounds-public.integration.test.ts::rounds saved by the recruiter appear in public detail`                                     | AC1, AC2 |
| T3  | unit        | `process-timeline.test.ts::uses shared labels and hides empty values`                                                              | AC2, AC3 |
| T4  | e2e         | `apps/web/e2e/scrum-41-rounds-builder.spec.ts::AC1: recruiter sets format and duration and they persist` (extends SCRUM-41's spec) | AC1      |

## SCRUM-48 — Candidate applies to a job via API

### User story

As a candidate, I want to apply for a job with one of my CVs and an optional short cover letter, so that applying is quick and simple.

### Acceptance criteria

- AC1: `POST /applications` returns 201 with the application DTO on success.
- AC2: 404 when the job is not published; 403 when the resume belongs to someone else; 409 on a duplicate application; 401 without a session; 403 for non-candidates.
- AC3: the first `ApplicationStatusHistory` row (`SUBMITTED`) is written in the same transaction; `currentStageId` is the first stage when the job has stages.
- AC4: `coverLetter` is optional, at most 2000 characters (400 above).

### Files

- Create: `packages/shared/src/schemas/application.ts` (`createApplicationSchema`, `applicationDtoSchema`), `apps/api/src/modules/application/application.{routes,controller,service}.ts`, `application.test.ts`
- Modify: `apps/api/prisma/schema.prisma` (`Application.coverLetter String?`), `apps/api/src/app.ts` (mount `/applications` behind `authenticate` + `authorize('CANDIDATE')`), `packages/shared/src/index.ts`

### Test cases

| ID  | Type        | File::test name                                                                              | Proves |
| --- | ----------- | -------------------------------------------------------------------------------------------- | ------ |
| T1  | integration | `application.test.ts::201 with application DTO`                                              | AC1    |
| T2  | integration | `application.test.ts::404 unpublished job`                                                   | AC2    |
| T3  | integration | `application.test.ts::403 resume of another candidate`                                       | AC2    |
| T4  | integration | `application.test.ts::409 duplicate application`                                             | AC2    |
| T5  | integration | `application.test.ts::401 without session, 403 for recruiter`                                | AC2    |
| T6  | integration | `application.test.ts::writes SUBMITTED history in the same transaction and sets first stage` | AC3    |
| T7  | integration | `application.test.ts::400 when cover letter exceeds 2000 characters`                         | AC4    |

## SCRUM-49 — Swappable AI provider with mock and Gemini drivers

### User story

As the Launchly team, we want one AI provider interface with a mock driver, so that AI features can be built, tested and demoed without depending on one vendor or a paid key. (Real driver changed from Anthropic to Gemini by the user; Jira text is edited at approval.)

### Acceptance criteria

- AC1: selecting the driver by `AI_DRIVER` (`mock` or `gemini`) works; `gemini` without `GEMINI_API_KEY` fails fast at startup.
- AC2: the output is validated against the caller's Zod schema; invalid output becomes an `AppError`.
- AC3: the 30 s timeout and vendor errors become an `AppError` with code `AI_UNAVAILABLE`.
- AC4: unit tests use only the mock driver or an injected `fetch`; no network.

### Files

- Create: `apps/api/src/providers/ai/ai.interface.ts` (`AiProvider.generateJson<T>(input: { prompt: string; system?: string; schema: z.ZodType<T> }): Promise<T>`), `mock-ai.provider.ts` (deterministic canned output built from the schema), `gemini-ai.provider.ts` (REST `generateContent` via injected `fetch`, `AbortSignal.timeout(30000)`, `responseMimeType: application/json`, schema from `z.toJSONSchema`), `index.ts` (`getAiProvider()`), `ai.provider.test.ts`
- Modify: `apps/api/src/lib/env.ts` (`AI_DRIVER`, `AI_MODEL` default `gemini-3.5-flash-lite` (verified live with `ai:smoke`; the 2.5 models return 404, 3.5-flash timed out under load), required-key refinement, export `envSchema`), `apps/api/.env.example`, `packages/shared/src/schemas/error.ts` and `apps/api/src/lib/app-error.ts` (`AI_UNAVAILABLE` → 503)

### Test cases

| ID  | Type | File::test name                                                             | Proves |
| --- | ---- | --------------------------------------------------------------------------- | ------ |
| T1  | unit | `ai.provider.test.ts::getAiProvider returns the driver chosen by AI_DRIVER` | AC1    |
| T2  | unit | `ai.provider.test.ts::env rejects AI_DRIVER=gemini without GEMINI_API_KEY`  | AC1    |
| T3  | unit | `ai.provider.test.ts::mock output validates against the schema`             | AC2    |
| T4  | unit | `ai.provider.test.ts::invalid model output throws AppError`                 | AC2    |
| T5  | unit | `ai.provider.test.ts::timeout and non-200 map to AI_UNAVAILABLE`            | AC3    |
| T6  | unit | `ai.provider.test.ts::gemini driver uses the injected fetch only`           | AC4    |

## SCRUM-50 — Extract text from uploaded PDF CVs

### User story

As a candidate, I want Launchly to read my PDF CV in Vietnamese or English, and tell me clearly when it cannot, so that the AI assesses my real CV.

### Acceptance criteria

- AC1: fixtures exist: one English PDF, one Vietnamese PDF, one image-only PDF.
- AC2: text is returned for the English and Vietnamese PDFs (whitespace normalised, Vietnamese diacritics kept); the image-only PDF gives the clear error.
- AC3: unit tests cover all three.

### Files

- Create: `apps/api/src/modules/candidate/cv-text.service.ts` (`extractPdfText(buffer: Buffer): Promise<string>` and `getResumeText(resume: { storageKey: string }, storage?: StorageProvider): Promise<string>`), `cv-text.test.ts`, `apps/api/src/modules/candidate/__fixtures__/{cv-en.pdf,cv-vi.pdf,cv-scanned.pdf}`
- Modify: `apps/api/package.json` and `pnpm-lock.yaml` (`unpdf`)

### Test cases

| ID  | Type | File::test name                                                                  | Proves   |
| --- | ---- | -------------------------------------------------------------------------------- | -------- |
| T1  | unit | `cv-text.test.ts::fixtures exist and are valid PDFs`                             | AC1      |
| T2  | unit | `cv-text.test.ts::English PDF returns its text`                                  | AC2, AC3 |
| T3  | unit | `cv-text.test.ts::Vietnamese PDF keeps diacritics (NFC)`                         | AC2, AC3 |
| T4  | unit | `cv-text.test.ts::image-only PDF throws AppError with the "text-based PDF" hint` | AC2, AC3 |
| T5  | unit | `cv-text.test.ts::normalises whitespace`                                         | AC2      |
