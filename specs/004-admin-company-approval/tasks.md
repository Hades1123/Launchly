---

description: "Task list for SCRUM-71 admin company moderation"
---

# Tasks: Admin Approves or Rejects Companies

**Input**: Design documents from `specs/004-admin-company-approval/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/admin-companies.md

**Tests**: TDD is required (constitution Principle IV). Every test task runs RED before its implementation task; record RED and GREEN output in the PR.

**Organization**: by user story (US1 decide, US2 email, US3 re-register).

## Phase 1: Setup

- [ ] T001 Add `reviewedById String?`, `reviewedAt DateTime?` and relation `reviewedBy User? @relation("CompanyReviewer", fields: [reviewedById], references: [id], onDelete: SetNull)` with `@@index([reviewedById])` to `Company`, the same with `"JobReviewer"` to `Job`, and back-relations `reviewedCompanies` / `reviewedJobs` on `User` in apps/api/prisma/schema.prisma; run `pnpm --filter @launchly/api exec prisma migrate dev --name moderation_review_audit` to create apps/api/prisma/migrations/<ts>_moderation_review_audit/migration.sql (SCRUM-75 T1, T2)

## Phase 2: Foundational (shared contracts)

- [ ] T002 [P] Write failing tests in packages/shared/src/schemas/moderation.test.ts: `moderationRejectSchema` rejects `""`, `"   "` and 1001 chars, accepts and trims `" ok "`; `adminCompanyListQuerySchema` defaults `status` to `PENDING` and rejects `"DRAFT"`; `adminCompanySchema` parses a full row with `moderationReason: null`, `reviewedAt: null`
- [ ] T003 Implement packages/shared/src/schemas/moderation.ts (`moderationRejectSchema`: reason trimmed, "1..1000"; `adminCompanyListQuerySchema`; `adminCompanySchema` per contracts/admin-companies.md) and export it from packages/shared/src/index.ts
- [ ] T004 Add `moderationReason: z.string().nullable()` to `companyDtoSchema` in packages/shared/src/schemas/company.ts, then `moderationReason: true` to `companySelect` and `CompanyRow` in apps/api/src/modules/company/company.service.ts so `pnpm typecheck` passes (SCRUM-76 T2)

## Phase 3: User Story 1 - Admin decides on a pending company (P1) 🎯 MVP

**Goal**: admins list, view, approve and reject companies; double decisions are refused.

**Independent Test**: supertest on the admin router with a mocked Prisma client, plus one DB test for E1.

- [ ] T005 [US1] Write failing supertest cases in apps/api/src/modules/admin/admin-company.test.ts (pattern of company.routes.test.ts, fake `MailProvider`): list returns PENDING rows ordered `createdAt asc` with `ownerEmail` (FR-002); 401 without token and 403 for RECRUITER on every route (E3); GET unknown id → 404; approve → 200 APPROVED, `updateMany` called with `where { id, moderationStatus: 'PENDING' }` and data `{ moderationStatus: 'APPROVED', moderationReason: null, reviewedById, reviewedAt }`; reject with `{ reason: 'x' }` → 200 REJECTED with the reason; reject with `"   "` → 400 (E2); `updateMany` count 0 on an existing APPROVED row → 409 CONFLICT naming the current status (E1)
- [ ] T006 [US1] Implement apps/api/src/modules/admin/admin-company.service.ts (`list`, `get`, `approve`, `reject` per research.md R1), apps/api/src/modules/admin/admin-company.controller.ts (parse responses with `adminCompanySchema`) and apps/api/src/modules/admin/admin-company.routes.ts (`authenticate` + `authorize('ADMIN')` on all routes, `validate({ params: companyIdParamsSchema, query, body })`)
- [ ] T007 [US1] Mount `app.use('/admin/companies', createAdminCompanyRouter(authService, createAdminCompanyService(prisma, mail)))` in apps/api/src/app.ts with a new `mail = createMailProvider()` parameter on `createApp` (research.md R3)
- [ ] T008 [US1] Write apps/api/src/modules/admin/admin-company.integration.test.ts behind `RUN_DB_TESTS=1`: seed one PENDING company, fire two approve calls with `Promise.all`, expect exactly one 200 and one 409, and the row `APPROVED` with `reviewedById` set (SC-003)

## Phase 4: User Story 2 - Recruiter is told the outcome by email (P2)

**Goal**: one email per decision; mail failures never undo it.

**Independent Test**: fake `MailProvider` in admin-company.test.ts; template unit test.

- [ ] T009 [P] [US2] Write failing tests in apps/api/src/providers/mail/moderation-email-templates.test.ts: `company-approved` subject and text contain the company name; `company-rejected` text contains the reason; `<script>` in name or reason is escaped in `html` (FR-015)
- [ ] T010 [US2] Implement `createModerationEmail({ kind, companyName, reason? })` in apps/api/src/providers/mail/moderation-email-templates.ts returning `{ subject, text, html }` (Vietnamese, plain layout, escaped values)
- [ ] T011 [US2] Add failing cases to apps/api/src/modules/admin/admin-company.test.ts: approve and reject each call `mail.send` once with `to` = owner email (FR-008); `mail.send` rejecting still returns 200 and `console.error` is called (FR-009, E7); a 409 decision does not call `mail.send` (FR-014)
- [ ] T012 [US2] Send the email after a successful update in apps/api/src/modules/admin/admin-company.service.ts with `void mail.send(...).catch(...)` (research.md R2)

## Phase 5: User Story 3 - Recruiter with a rejected company starts over (P3)

**Goal**: rejected recruiters see the reason and can register another company.

**Independent Test**: supertest in company.routes.test.ts.

- [ ] T013 [US3] Add failing cases to apps/api/src/modules/company/company.routes.test.ts: POST with an existing PENDING or APPROVED company → 409 (E4); with only REJECTED companies → 201 (E5), asserting `findFirst` is called with `moderationStatus: { in: ['PENDING', 'APPROVED'] }`; GET /me queries `orderBy: { createdAt: 'desc' }` and returns `moderationReason` (FR-010, FR-011)
- [ ] T014 [US3] Change the `create` guard and `getMine` ordering in apps/api/src/modules/company/company.service.ts (research.md R5)

## Phase 6: Polish

- [ ] T015 Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, the T008 DB test and `prisma migrate diff` (schema drift); record exit codes in the PR evidence table, with the coverage gate as "n/a: not available"
- [ ] T016 Check the handwritten diff stays near 300 lines (`git diff --stat origin/main...HEAD`, excluding migration SQL, lockfile, `specs/**`); if far over, stop and propose a split

## Dependencies & Execution Order

- T001 → T004 (Prisma client types) → all later tasks.
- T002 → T003 → T004.
- US1 (T005 to T008) before US2 (T011, T012 extend the same service and test file); T009 and T010 can run alongside US1.
- US3 (T013, T014) depends only on T004 and can run alongside US1 and US2.
- T015, T016 last.

## Parallel Example

```text
After T004: T005 (US1 tests) | T009 (email template tests) | T013 (re-registration tests)
```

## Implementation Strategy

MVP is US1 alone (admins can approve; demo flow unblocked). US2 and US3 follow on the same branch and PR. Commit after each GREEN step: `feat(db|shared|api): SCRUM-71 <summary>`, `test(api): SCRUM-71 <summary>`.
