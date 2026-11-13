# Wave 2 — Core APIs and entry pages

Plan approved by: nvdson2005 at f4b0966 (2026-11-13)

Wave plan source: `docs/plans/mvp-wave-plan.md` · Branch: `feat/wave-2-core-apis-and-entry-pages` · Sprint: `SCRUM Sprint 3` (id 4)

## Tickets

Build order. SCRUM-57 is dropped from this wave (unmet dependency SCRUM-26, In Progress) and moves to Wave 4 together with SCRUM-60.

| Key      | Title                                                   | Label   | Areas              | Depends on          | Assignee              |
| -------- | ------------------------------------------------------- | ------- | ------------------ | ------------------- | --------------------- |
| SCRUM-47 | Full job details from the public job detail API         | feature | api, shared        | SCRUM-29            | VINH NÔNG THẾ         |
| SCRUM-53 | Job detail page for candidates                          | feature | web                | SCRUM-46, SCRUM-47  | VĂN NGUYỄN THIÊN      |
| SCRUM-54 | Candidate lists own applications with status history    | feature | api, shared        | SCRUM-48            | DŨNG NGUYỄN PHẠM MẠNH |
| SCRUM-55 | Recruiter lists applicants and changes status via API   | feature | api, shared        | SCRUM-48            | SĨ LÊ NGUYỄN VĂN      |
| SCRUM-56 | AI scores how well a CV matches a job description       | feature | api, shared, db    | SCRUM-49, SCRUM-50  | SƠN NGUYỄN VÕ ĐỨC     |

## Clarifications

All answered "defaults" by the user.

| #   | Ticket   | Question                          | Answer (all default)                                                                                                                                                                                  | Source |
| --- | -------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Q1  | SCRUM-57 | Where does it go?                 | Move SCRUM-57 and SCRUM-60 to Wave 4 in `docs/plans/mvp-wave-plan.md` (60 depends on 57). Plan edit ships in this PR.                                                                                | user   |
| Q2  | SCRUM-56 | AI consent flag has no storage    | Add `CandidateProfile.aiConsentAcceptedAt DateTime?` in the wave's single migration. SCRUM-56 reads it (403 when null). SCRUM-61 adds the setter. Tests set it via Prisma.                          | user   |
| Q3  | SCRUM-56 | Result storage                    | Add `AiAssessment.result Json?` with the full validated output; also fill `score`, `matchedSkills`, `missingSkills`, `suggestions`.                                                                  | user   |
| Q4  | SCRUM-56 | Job source, timeout               | `jobId` must be a public job (else 404). Prompt = title + description + requirements. 30 s timeout is a service-level race (injectable). Timeout/invalid output → `FAILED` row + `AppError`.         | user   |
| Q5  | SCRUM-55 | Status rules                      | Any of SCREENING/INTERVIEW/OFFER/ACCEPTED/REJECTED from any state; same status as current → 400; `stageId` must belong to the job → else 400. One history row per change, same transaction.          | user   |
| Q6  | SCRUM-55 | Contract doc                      | `docs/api/recruiter-applications.md`, linked from the PR and a Jira comment on SCRUM-60.                                                                                                              | user   |
| Q7  | SCRUM-53 | Job cards and preview pane        | Cards link to `/jobs/[id]`; remove the mock-backed preview pane; list becomes one column.                                                                                                             | user   |
| Q8  | SCRUM-53 | Company logo                      | Initials avatar; `logoUrl` returned by the API but not rendered.                                                                                                                                      | user   |
| Q9  | SCRUM-54 | List shape                        | No pagination, newest first; another candidate's application id → 404.                                                                                                                                | user   |

## Cross-ticket changes

- `packages/shared/src/schemas/job.ts`: SCRUM-47 only. `packages/shared/src/schemas/application.ts` and `packages/shared/src/index.ts`: SCRUM-54 and SCRUM-55 both add DTOs (append-only, no clash). New `packages/shared/src/schemas/assessment.ts`: SCRUM-56.
- `apps/api/src/modules/application/*` (routes, controller, service): SCRUM-54 and SCRUM-55. `GET /applications/me` is registered before `/:id`. `GET /applications/:id` (candidate owner only, SCRUM-54) and `GET /applications/:id/resume` (owner recruiter or candidate, SCRUM-55) use separate paths.
- `GET /jobs/:jobId/applications` (SCRUM-55) mounts under `/jobs` in a new router, beside `createJobRoundsRouter`.
- One Prisma migration, from SCRUM-56 only (`aiConsentAcceptedAt`, `AiAssessment.result`). Committed last of the API tickets.
- `apps/web/src/lib/api/jobs.ts` and the jobs list page: SCRUM-53 only, depends on SCRUM-47's schema.
- Build order: SCRUM-47 (shared schema first) → SCRUM-53 → SCRUM-54 → SCRUM-55 → SCRUM-56.

## Constitution Check

- I. Shared Contracts First: pass. Every new request/response shape is a Zod schema in `packages/shared`; web parses API replies with the same schemas.
- II. Layered Modular Monolith: pass. route → controller → service → Prisma; AI reached through `AiProvider`, CV text through `getResumeText`, files through `StorageProvider`.
- III. Secure by Default: pass. Role guards (`authorize`), ownership checks (404 for foreign candidate application, 403 for non-owner recruiter), no profile PII in the AI prompt, AI consent required.
- IV. Tested Business Logic: pass. TDD, every AC mapped to a test below. Wave delivery exception (minimal plan, one branch/PR, agent review) is declared in the Jira comments.
- V. Safe Data Evolution: pass. One additive nullable migration, no edit of committed migrations.
- VI. Simplicity and Pinned Dependencies: pass. No new dependency.

## SCRUM-47 — Full job details from the public job detail API

### User story

As a candidate, I want to see a job's full details (requirements, benefits and hiring rounds), so that I can decide whether to apply.

### Acceptance criteria

- AC1: Detail response contains requirements, benefits, industry, createdAt, company summary (id, name, website, logoUrl), validated by the shared schema.
- AC2: Stages are ordered by position.
- AC3: Non-published job → 404 via `AppError`.
- AC4: supertest coverage for both cases (AC1 + AC3), SCRUM-38 salary rules kept.

### Files

- Modify: `packages/shared/src/schemas/job.ts`, `apps/api/src/modules/job/job.service.ts`
- Create: `apps/api/src/modules/job/job-detail-full.test.ts`
- Modify: `packages/shared/src/schemas/job.test.ts`

### Test cases

| ID  | Type        | File::test name                                                                                | Proves   |
| --- | ----------- | ---------------------------------------------------------------------------------------------- | -------- |
| T1  | unit        | `packages/shared/src/schemas/job.test.ts::publicJobDetailSchema accepts the extended detail`    | AC1      |
| T2  | integration | `job-detail-full.test.ts::GET /jobs/:id returns requirements, benefits, industry, createdAt, company summary` | AC1, AC4 |
| T3  | integration | `job-detail-full.test.ts::GET /jobs/:id orders stages by position`                              | AC2      |
| T4  | integration | `job-detail-full.test.ts::GET /jobs/:id returns 404 for a non-published job`                    | AC3, AC4 |
| T5  | integration | `job-detail-full.test.ts::GET /jobs/:id still hides a hidden salary`                            | AC4      |

## SCRUM-53 — Job detail page for candidates

### User story

As a candidate, I want to open a job from the search results and read everything about it on one page, so that I can judge whether it fits me before applying.

### Acceptance criteria

- AC1: Clicking a job card opens its detail page.
- AC2: All fields render (title, company link, level, location, salary respecting hidden salary, description, requirements, benefits, hiring process); empty lists are hidden.
- AC3: Unknown id shows the not-found page.
- AC4: Semantic design tokens only; works at phone width.
- AC5: Playwright e2e: search → open detail.

### Files

- Create: `apps/web/src/app/(main)/jobs/[id]/page.tsx`, `apps/web/src/app/(main)/jobs/[id]/not-found.tsx`, `apps/web/e2e/scrum-53-job-detail.spec.ts`
- Modify: `apps/web/src/lib/api/jobs.ts`, `apps/web/src/app/(main)/jobs/page.tsx`, `apps/web/src/components/jobs/job-list-card.tsx`
- Remove: preview-pane use of `mock-jobs` in the list page (Q7)

### Test cases

| ID  | Type | File::test name                                                                 | Proves   |
| --- | ---- | ------------------------------------------------------------------------------- | -------- |
| T6  | e2e  | `scrum-53-job-detail.spec.ts::AC1: clicking a job card opens its detail page`    | AC1, AC5 |
| T7  | e2e  | `scrum-53-job-detail.spec.ts::AC2: the detail page shows the job fields and hiring process` | AC2 |
| T8  | e2e  | `scrum-53-job-detail.spec.ts::AC3: an unknown job id shows the not-found page`   | AC3      |
| T9  | e2e  | `scrum-53-job-detail.spec.ts::AC4: the detail page fits a phone width without horizontal scroll` | AC4 |

AC4 "tokens only" is enforced by lint plus the agent review against `docs/Frontend-Conventions.md`.

## SCRUM-54 — Candidate lists own applications with status history

### User story

As a candidate, I want to see the status and history of every application I submitted, so that I don't have to guess where I stand.

### Acceptance criteria

- AC1: `GET /applications/me` returns only the caller's applications (job title, company name, status, current stage name, submittedAt, updatedAt), newest first.
- AC2: Another candidate's application id → 404 on `GET /applications/:id`.
- AC3: History (from/to, note, changedAt) ordered by `changedAt`, plus the job's stages.
- AC4: supertest coverage; shared Zod DTOs.

### Files

- Modify: `packages/shared/src/schemas/application.ts`, `packages/shared/src/index.ts`, `apps/api/src/modules/application/application.{routes,controller,service}.ts`
- Create: `apps/api/src/modules/application/application-candidate.test.ts`

### Test cases

| ID  | Type        | File::test name                                                                              | Proves   |
| --- | ----------- | -------------------------------------------------------------------------------------------- | -------- |
| T10 | integration | `application-candidate.test.ts::GET /applications/me lists only the caller's applications, newest first` | AC1, AC4 |
| T11 | integration | `application-candidate.test.ts::GET /applications/me is forbidden for a recruiter`            | AC4      |
| T12 | integration | `application-candidate.test.ts::GET /applications/:id returns 404 for another candidate's application` | AC2 |
| T13 | integration | `application-candidate.test.ts::GET /applications/:id returns history ordered by changedAt and the job stages` | AC3 |
| T14 | unit        | `packages/shared/src/schemas/application.test.ts::application list and detail DTOs parse`     | AC4      |

## SCRUM-55 — Recruiter lists applicants and changes status via API

### User story

As a recruiter, I want to list the applicants of my job and move them between stages, so that I can track every candidate in one place.

### Acceptance criteria

- AC1: Non-owner recruiter → 403; candidate → 403 on list and patch.
- AC2: Invalid status, or a stage from another job → 400.
- AC3: Each status change adds exactly one history row (same transaction).
- AC4: supertest coverage for `GET /jobs/:jobId/applications`, `PATCH /applications/:id/status`, `GET /applications/:id/resume` (owner recruiter or the candidate).
- AC5: Contract documented in `docs/api/recruiter-applications.md` (response fields, status values, error codes 400/403) for SCRUM-60.

### Files

- Modify: `packages/shared/src/schemas/application.ts`, `packages/shared/src/index.ts`, `apps/api/src/modules/application/application.{routes,controller,service}.ts`, `apps/api/src/app.ts`
- Create: `apps/api/src/modules/application/job-applications.routes.ts`, `apps/api/src/modules/application/application-recruiter.test.ts`, `docs/api/recruiter-applications.md`

### Test cases

| ID  | Type        | File::test name                                                                                  | Proves   |
| --- | ----------- | ------------------------------------------------------------------------------------------------ | -------- |
| T15 | integration | `application-recruiter.test.ts::lists applicants of an owned job with candidate, resume, status, stage` | AC4 |
| T16 | integration | `application-recruiter.test.ts::a non-owner recruiter gets 403 on list, patch and resume`         | AC1      |
| T17 | integration | `application-recruiter.test.ts::a candidate gets 403 on list and patch`                           | AC1      |
| T18 | integration | `application-recruiter.test.ts::rejects an invalid status, a repeated status and a stage of another job with 400` | AC2 |
| T19 | integration | `application-recruiter.test.ts::a status change writes exactly one history row`                   | AC3      |
| T20 | integration | `application-recruiter.test.ts::resume download works for the owner recruiter and the candidate`  | AC4      |
| T21 | unit        | `packages/shared/src/schemas/application.test.ts::update-status body accepts the five allowed statuses only` | AC2 |
| T22 | doc check   | `application-recruiter.test.ts::contract doc lists every endpoint` (reads the doc file)           | AC5      |

## SCRUM-56 — AI scores how well a CV matches a job description

### User story

As a candidate, I want AI to score how well my CV matches a job and list what matches and what is missing, so that I know whether to apply and what to improve.

### Acceptance criteria

- AC1: Valid `POST /assessments` returns the result (score 0–100, matched points by category, missing skills tagged `required`/`nice_to_have`, ≥3 suggestions, evidence quotes) and stores it in `AiAssessment` as COMPLETED.
- AC2: Neither or both of `jobId` / `jobDescription` → 400; foreign resume → 403; missing AI consent → 403.
- AC3: Provider timeout (30 s) or invalid output → FAILED row with `failureReason` + clear `AppError`.
- AC4: Tests use the mock driver.
- AC5: Only CV text and JD text go into the prompt (no name, email, photo, age, gender, hometown).

### Files

- Create: `packages/shared/src/schemas/assessment.ts` (+ test), `apps/api/src/modules/assessment/assessment.{routes,controller,service}.ts`, `apps/api/src/modules/assessment/assessment.test.ts`, migration `apps/api/prisma/migrations/<ts>_ai_consent_and_assessment_result/`
- Modify: `apps/api/prisma/schema.prisma`, `packages/shared/src/index.ts`, `apps/api/src/app.ts`

### Test cases

| ID  | Type        | File::test name                                                                       | Proves   |
| --- | ----------- | ------------------------------------------------------------------------------------- | -------- |
| T23 | integration | `assessment.test.ts::returns and stores a COMPLETED assessment for a jobId`            | AC1, AC4 |
| T24 | integration | `assessment.test.ts::accepts a pasted jobDescription`                                  | AC1      |
| T25 | integration | `assessment.test.ts::400 when neither or both of jobId and jobDescription are sent`    | AC2      |
| T26 | integration | `assessment.test.ts::403 for another candidate's resume`                               | AC2      |
| T27 | integration | `assessment.test.ts::403 when AI consent was not accepted`                             | AC2      |
| T28 | integration | `assessment.test.ts::a provider timeout stores a FAILED row and returns an error`      | AC3      |
| T29 | integration | `assessment.test.ts::invalid provider output stores a FAILED row and returns an error` | AC3      |
| T30 | unit        | `assessment.test.ts::the prompt contains CV and job text only, no profile PII`         | AC5      |
| T31 | unit        | `packages/shared/src/schemas/assessment.test.ts::result schema enforces score range, ≥3 suggestions, skill tags` | AC1 |
