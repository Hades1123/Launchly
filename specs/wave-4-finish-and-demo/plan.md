# Wave 4 — Finish and demo

Plan approved by: Sơn Nguyễn Võ Đức at b669fdb (2026-11-13)

Wave plan source: `docs/plans/mvp-wave-plan.md` · Branch: `feat/wave-4-finish-and-demo` · Sprint: `SCRUM Sprint 3` (id 4, active)

## Tickets

Build order: SCRUM-82 first (migration and shared constants, so demo data is final and SCRUM-57 builds on the final `JOB_LEVELS`), then SCRUM-57, then SCRUM-60 (needs 57's link and the route it points to).

| Key      | Title                                             | Label       | Areas                | Depends on                 | Assignee (keeps existing) |
| -------- | ------------------------------------------------- | ----------- | -------------------- | -------------------------- | ------------------------- |
| SCRUM-82 | Replace job level SENIOR with JUNIOR              | maintenance | db, shared, api, web | SCRUM-52 (To Do, see Q7)   | Sơn Nguyễn Võ Đức         |
| SCRUM-57 | Recruiter sees own jobs with applicant counts     | feature     | api, shared, web     | SCRUM-26 (merged)          | Sơn Nguyễn Võ Đức         |
| SCRUM-60 | Recruiter reviews applicants and updates status   | feature     | web                  | SCRUM-55 (merged), SCRUM-57 | Sơn Nguyễn Võ Đức        |

## Clarifications

| #  | Ticket   | Question                                                                 | Answer                                                                                                                                            | Source |
| -- | -------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Q1 | SCRUM-57 | Ticket says no recruiter job list exists. Extend the existing one?        | Yes. `GET /recruiter/jobs` and the My jobs page shipped in SCRUM-26; this ticket adds `applicantCount` and the "View applicants" link. Est. ≈2 pts. | user (default), code: `recruiter-job.service.ts:136`, `recruiter/jobs/page.tsx` |
| Q2 | SCRUM-57 | What does the count include?                                              | All applications of the job, including `WITHDRAWN`, matching `listForJob` (the applicants table).                                                 | user (default), code: `application.service.ts:229` |
| Q3 | SCRUM-57 | Link for which rows?                                                      | Only `PUBLISHED` and `CLOSED` jobs; other rows show `—` instead of a count and no link.                                                           | user (default) |
| Q4 | SCRUM-60 | Seed data for the e2e "move to Interview" flow?                           | Reuse seeded job "Lập trình viên Backend Node.js" (recruiter@launchly.test); the test creates candidate1's application through the API, as `scrum-59` does, and clears it first with `resetApplication`. | user (default), `e2e/scrum-59-my-applications.spec.ts` |
| Q5 | SCRUM-60 | 403 state needs a second recruiter. Exists in seed?                       | No (only `recruiter@launchly.test`). The 403 UI is tested in e2e by stubbing `GET /api/jobs/:id/applications` with a 403 response; server-side 403 is already covered by `application-recruiter.test.ts` (SCRUM-55). | user (default), code: `seed/data.ts:143` |
| Q6 | all      | Branch base and the two local commits?                                    | Branch `feat/wave-4-finish-and-demo` from current `HEAD` (= `origin/main` + `d6c3537` wave-plan refinement + `1d0ebdb` CLAUDE.md), so both commits are part of the PR. Deviation from the skill's `origin/main` base, per user. | user |
| Q7 | SCRUM-82 | SCRUM-52 is still To Do in Jira. Block?                                   | No. Decision (option a) is recorded in SCRUM-82's text. Note it in the Jira comment; do not touch SCRUM-52.                                       | user (default) |

Web has no unit-test runner (`apps/web/package.json` has only Playwright), so web ACs are proven by e2e; no new web test tooling is added (Principle VI).

## Cross-ticket changes

- `packages/shared`: SCRUM-82 edits `constants/job.ts` (`JOB_LEVELS`); SCRUM-57 edits `schemas/job-posting.ts` (`recruiterJobListItemSchema`). Different files, no conflict.
- `apps/web/src/components/recruiter/recruiter-job-list.tsx`: SCRUM-57 only. `job-status-badge.tsx` (level labels): SCRUM-82 only.
- Prisma: **one** migration (SCRUM-82 only); SCRUM-57 and SCRUM-60 change no schema.
- e2e: new specs per ticket; existing `scrum-53-job-detail.spec.ts` updated by SCRUM-82 ("Senior" badge → "Junior").

## Constitution Check

- I. Shared Contracts First: pass. `applicantCount` and `JOB_LEVELS` live in `@launchly/shared`; web consumes the existing application schemas.
- II. Layered Modular Monolith: pass. Count added in `recruiter-job.service.ts` via Prisma; no controller-side logic.
- III. Secure by Default: pass. `GET /recruiter/jobs` stays recruiter-only and owner-scoped; SCRUM-60 adds no endpoints and the server stays the permission source.
- IV. Tested Business Logic: pass, with the Wave delivery exception (single wave plan instead of the full Spec Kit chain, fresh-agent review).
- V. Safe Data Evolution: pass. New migration, committed one untouched, SENIOR rows remapped before the enum is recreated, CI drift check.
- VI. Simplicity and Pinned Dependencies: pass. No new dependencies.

## SCRUM-82 — Replace job level SENIOR with JUNIOR

### User story

As the Product Owner, I want job levels to be Intern, Fresher and Junior, so that job posts and level filters match our intern, fresher and junior audience.

### Acceptance criteria

- AC1: Migration applies on a fresh database and on one that already has SENIOR jobs (they become JUNIOR).
- AC2: The job filter, post-job form and job cards show Intern / Fresher / Junior; Senior appears nowhere (as a level).
- AC3: An API request with `level=SENIOR` is rejected by validation; `level=JUNIOR` works.
- AC4: `pn typecheck`, `pn lint`, `pn test` pass; existing e2e specs still pass.
- AC5: Schema drift check in CI passes.

### Files

- Create: `apps/api/prisma/migrations/20261113110000_job_level_junior/migration.sql`, `apps/api/prisma/migrations/job-level-junior.migration.test.ts` (or colocated under `apps/api/prisma/`, DB-gated)
- Modify: `apps/api/prisma/schema.prisma`, `packages/shared/src/constants/job.ts`, `apps/api/prisma/seed/data.ts` (line ~333), `apps/api/src/modules/job/job.test.ts`, `apps/api/src/modules/job/job.search.integration.test.ts`, `apps/web/src/lib/job-format.ts`, `apps/web/src/components/recruiter/job-status-badge.tsx`, `apps/web/src/components/recruiter/job-posting-form.tsx` (level hint), `apps/web/src/components/jobs/job-filters.tsx`, `apps/web/src/app/(main)/jobs/page.tsx` (use `JOB_LEVELS`), `apps/web/e2e/scrum-53-job-detail.spec.ts`
- Not touched: `apps/api/scripts/ai-smoke.ts`, `specs/001-*`, `specs/002-*`, job titles containing "Senior".

### Test cases

| ID  | Type        | File::test name                                                                                  | Proves |
| --- | ----------- | ------------------------------------------------------------------------------------------------ | ------ |
| T1  | integration (`RUN_DB_TESTS=1`) | `apps/api/prisma/job-level-migration.integration.test.ts::remaps SENIOR rows to JUNIOR and recreates the enum` (runs the migration SQL in a scratch schema holding the old enum and a SENIOR row) | AC1 |
| T2  | integration (`RUN_DB_TESTS=1`) | same file::`applies on an empty table (fresh database)`                                          | AC1 |
| T3  | unit        | `apps/api/src/modules/job/job.test.ts::filters by level (INTERN, FRESHER, JUNIOR)`               | AC3 |
| T4  | unit        | `apps/api/src/modules/job/job.test.ts::rejects level=SENIOR with 400`                            | AC3 |
| T5  | integration | `apps/api/src/modules/job/job.search.integration.test.ts::level JUNIOR filter` (SENIOR cases replaced) | AC3 |
| T6  | e2e         | `apps/web/e2e/scrum-82-job-levels.spec.ts::AC2: filter, post-job form and job cards show Intern/Fresher/Junior and never Senior` | AC2 |
| T7  | e2e         | `apps/web/e2e/scrum-53-job-detail.spec.ts` (badge expectation "Junior"), all existing specs rerun | AC4 |
| T8  | gate        | `pnpm typecheck && pnpm lint && pnpm test`                                                       | AC4 |
| T9  | gate        | `prisma migrate diff --exit-code` drift check (same command CI runs)                             | AC5 |

## SCRUM-57 — Recruiter sees own jobs with applicant counts

### User story

As a recruiter, I want to see my jobs with how many people applied to each, so that I can go straight to the job that needs my attention.

### Acceptance criteria

- AC1: Only own jobs are listed; counts are correct.
- AC2: Link goes to the applicants page route (`/recruiter/jobs/[id]/applicants`).
- AC3: supertest + e2e.

### Files

- Modify: `packages/shared/src/schemas/job-posting.ts` (add `applicantCount: z.number().int().nonnegative()` to the list item schema, not to `recruiterJobSchema`), `apps/api/src/modules/job/recruiter-job.service.ts` (`list`: `_count: { select: { applications: true } }`), `apps/web/src/components/recruiter/recruiter-job-list.tsx` (count column and "View applicants" link in `JobRow`, `PUBLISHED`/`CLOSED` only; `—` otherwise)
- Create: `apps/web/e2e/scrum-57-recruiter-jobs-applicants.spec.ts`

### Test cases

| ID  | Type        | File::test name                                                                                   | Proves |
| --- | ----------- | ------------------------------------------------------------------------------------------------- | ------ |
| T1  | unit        | `packages/shared/src/schemas/job-posting.test.ts::list item requires a non-negative integer applicantCount` | AC1 |
| T2  | unit (supertest) | `apps/api/src/modules/job/recruiter-job.test.ts::list returns applicantCount per job`        | AC1 |
| T3  | integration | `apps/api/src/modules/job/recruiter-job.integration.test.ts::counts include withdrawn applications and exclude other recruiters' jobs` | AC1 |
| T4  | e2e         | `apps/web/e2e/scrum-57-recruiter-jobs-applicants.spec.ts::AC1: only own jobs are listed and each count matches the applicants API` | AC1 |
| T5  | e2e         | same file::`AC2: View applicants links to /recruiter/jobs/<id>/applicants (published jobs only)`  | AC2 |
| T6  | unit + e2e  | T2, T3 (supertest) and T4, T5 (e2e)                                                               | AC3 |

## SCRUM-60 — Recruiter reviews applicants and updates their status

### User story

As a recruiter, I want to review my applicants, open their CVs and update their status, so that I can screen candidates quickly and keep them informed.

### Acceptance criteria

- AC1: Changing status persists and shows in the candidate's My Applications.
- AC2: Non-owner recruiter sees a 403/forbidden state.
- AC3: Design tokens only.
- AC4: Playwright e2e: recruiter moves an applicant to Interview.
- Scope also covers: table (name, headline, skills, submitted date, round, status), status dropdown (Screening, Interview, Offer, Accepted, Rejected) + optional round select + optional note, "View CV", client-side status filter.

### Files

- Create: `apps/web/src/app/recruiter/jobs/[id]/applicants/page.tsx`, `apps/web/src/components/recruiter/applicants-table.tsx` (and small subcomponents if needed), `apps/web/src/lib/api/recruiter-applications.ts` (`listJobApplicants`, `updateApplicationStatus`; resume URL helper), `apps/web/e2e/scrum-60-applicants.spec.ts`
- Modify: none outside web; no API, schema or shared changes (consumes SCRUM-55 as-is).

### Test cases

| ID  | Type   | File::test name                                                                                                  | Proves |
| --- | ------ | ---------------------------------------------------------------------------------------------------------------- | ------ |
| T1  | e2e    | `apps/web/e2e/scrum-60-applicants.spec.ts::AC1: recruiter moves an applicant to Interview and the candidate sees Interview in My Applications` | AC1, AC4 |
| T2  | e2e    | same file::`AC2: a 403 from the applicants API shows the forbidden state` (route stub)                           | AC2 |
| T3  | e2e    | same file::`AC1: the table shows name, headline, skills, submitted date, round and status`                       | AC1 |
| T4  | e2e    | same file::`AC1: View CV opens the applicant's resume` (asserts the resume request returns 200 `application/pdf`) | AC1 |
| T5  | e2e    | same file::`AC1: the status filter narrows the table client-side`                                                | AC1 |
| T6  | static | `pnpm lint` plus fresh-agent review against `docs/Frontend-Conventions.md` (no raw palette classes or arbitrary values) | AC3 |
