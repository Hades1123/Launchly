---
description: 'Task list for SCRUM-73 admin job moderation'
---

# Tasks: Admin Approves or Rejects Jobs

**Input**: `specs/005-admin-job-approval/` (plan.md, spec.md, research.md, contracts/admin-jobs.md)

**Tests**: TDD (constitution IV): each test task runs RED before its implementation task.

## Phase 1: Foundational (shared contracts and reuse)

- [x] T001 Write failing cases in packages/shared/src/schemas/moderation.test.ts: `adminJobListQuerySchema` defaults to `PENDING` and rejects `DRAFT`; `adminJobSchema` parses a recruiter job plus `companyName`, `creatorEmail`, `reviewedAt: null`, with empty `rounds` and `notes` (E1 of SCRUM-79)
- [x] T002 Implement `adminJobListQuerySchema` (`z.enum(['PENDING','PUBLISHED','REJECTED']).default('PENDING')`) and `adminJobSchema = recruiterJobSchema.extend(...)` in packages/shared/src/schemas/moderation.ts
- [x] T003 Export `recruiterJobSelect` and `toRecruiterJobDto` (renamed from `jobSelect` / `toDto`) in apps/api/src/modules/job/recruiter-job.service.ts with no behaviour change (existing recruiter-job tests stay green)

## Phase 2: User Story 1 - Admin decides on a submitted job (P1) 🎯 MVP

- [x] T004 [US1] Write failing supertest cases in apps/api/src/modules/admin/admin-job.test.ts (pattern of admin-company.test.ts): 401/403 on all four routes (E3); list calls `findMany` with `where { publicationStatus: 'PENDING' }`, `orderBy { updatedAt: 'asc' }` and returns `companyName`, `creatorEmail`, rounds in order (FR-002, FR-003); unknown id → 404; approve calls `job.update` with `where { id, publicationStatus: 'PENDING' }` and data `{ publicationStatus: 'PUBLISHED', moderationReason: null, reviewedById, reviewedAt }`; reject stores the trimmed reason; blank reason → 400 (E2); P2025 + current `PUBLISHED` → 409 naming it (E1); other errors → 500
- [x] T005 [US1] Implement apps/api/src/modules/admin/admin-job.service.ts, admin-job.controller.ts, admin-job.routes.ts (`authorize('ADMIN')`, `validate({ params: jobIdParamsSchema, query, body })`) and mount `/admin/jobs` in apps/api/src/app.ts
- [x] T006 [US1] Write apps/api/src/modules/admin/admin-job.integration.test.ts (`RUN_DB_TESTS=1`): approved company + pending job; two concurrent approvals → one success, one CONFLICT; row `PUBLISHED` with `reviewedById`; public `JobService.getPublicJobById` resolves (SC-003, FR-008); a rejected job is not public

## Phase 3: User Story 2 - Recruiter is told the outcome by email (P2)

- [x] T007 [P] [US2] Write failing cases in apps/api/src/providers/mail/moderation-email-templates.test.ts: `job-published` subject has title and company; `job-rejected` text has the reason; HTML escaped; no line breaks in the subject
- [x] T008 [US2] Add the `job-published` / `job-rejected` kinds to apps/api/src/providers/mail/moderation-email-templates.ts
- [x] T009 [US2] Write failing cases in apps/api/src/modules/admin/admin-job.test.ts: approve/reject email the creator once (FR-009); mail failure → 200 and `console.error('Job moderation email failed')` only (FR-010, E6); 409 sends nothing
- [x] T010 [US2] Send the email after a successful decision in apps/api/src/modules/admin/admin-job.service.ts

## Phase 4: User Story 3 - Resubmitted job keeps its previous reason (P3)

- [x] T011 [US3] Change the test "resubmits it for review and clears the old reason" in apps/api/src/modules/job/recruiter-job.test.ts to expect `PENDING` and no `moderationReason` key in the update data (E4, FR-011); run RED
- [x] T012 [US3] Remove the SUBMIT reason reset and its comment in apps/api/src/modules/job/recruiter-job.service.ts

## Phase 5: Polish

- [x] T013 Run typecheck, lint, test, DB tests and schema drift; record in the PR (coverage n/a)
- [x] T014 Measure the handwritten diff against `feat/SCRUM-71-admin-company-approval` (`git diff --numstat feat/SCRUM-71-admin-company-approval...HEAD`); report if far over ~300. Result: +677 (source +235, tests +442); reported to the owner for a decision.

## Dependencies

T001 → T002 → T003 → T004 → T005 → T006. T007/T008 can run alongside US1. T009/T010 after T005. T011/T012 independent of US1/US2.

## Implementation Strategy

US1 is the MVP. Commit after each GREEN: `feat(shared|api): SCRUM-73 ...`, `test(api): SCRUM-73 ...`.
