---
description: 'Task list for SCRUM-72 admin moderation page for companies'
---

# Tasks: Admin Moderation Page for Companies

**Input**: `specs/006-admin-company-moderation-page/` (plan.md, spec.md, research.md)

**Tests**: TDD with Playwright (no web unit runner): write the e2e test, run it RED (an assertion on missing UI, not a server or setup error), build the UI, run GREEN.

## Phase 1: Foundational

- [ ] T001 Add `listAdminCompanies(status)`, `getAdminCompany(id)`, `approveCompany(id)`, `rejectCompany(id, reason)` in apps/web/src/lib/api/admin-companies.ts, parsing with `adminCompanySchema`
- [ ] T002 Write apps/web/e2e/scrum-72-admin-company-moderation.spec.ts with `beforeEach`/`afterAll` `resetModeration()`: E3 a recruiter opening `/admin/moderation` sees "Khu vực dành cho quản trị viên"; run RED
- [ ] T003 Add `AdminShell` (apps/web/src/components/admin/admin-shell.tsx) and apps/web/src/app/admin/layout.tsx; add the ADMIN entry "Duyệt nội dung" → `/admin/moderation` in apps/web/src/components/layout/user-menu.tsx; GREEN for E3

## Phase 2: User Story 1 - Admin reviews and decides (P1) 🎯 MVP

- [ ] T004 [US1] Add e2e tests: AC1 admin opens the menu entry and sees "Draft Ventures" in "Công ty chờ duyệt" with industry, size, date; AC2 opening it shows address, website, description and owner email; run RED
- [ ] T005 [US1] Build apps/web/src/components/admin/moderation-tabs.tsx, pending-company-list.tsx, apps/web/src/app/admin/moderation/page.tsx (with E2 empty state "Không có mục nào cần duyệt") and the read-only part of company-review.tsx + apps/web/src/app/admin/moderation/companies/[id]/page.tsx; GREEN
- [ ] T006 [US1] Add e2e tests: AC3 approve → "Đã duyệt", buttons gone, public `/companies/:id` opens, and the queue (now empty, the seed has one pending company) shows "Không có mục nào cần duyệt" (E2); D3/T3 reject confirm disabled until a non-blank reason is typed, then "Bị từ chối" with the reason; E1 a company already decided via the API shows "Mục này đã được xử lý" and no buttons after clicking approve; run RED
- [ ] T007 [US1] Build apps/web/src/components/admin/reject-dialog.tsx (generic `onSubmit(reason)`) and the decision part of company-review.tsx (approve, reject, CONFLICT reload); GREEN

## Phase 3: User Story 2 - Rejected recruiter's next step (P2)

- [ ] T008 [US2] Add e2e test: AC4/E4 `recruiter.rejected` sees the reason and "Đăng ký công ty khác", which opens `/company/register`; run RED
- [ ] T009 [US2] Show `moderationReason` and the link in the REJECTED company card of apps/web/src/components/recruiter/recruiter-shell.tsx; GREEN

## Phase 4: Polish

- [ ] T010 Run typecheck, lint, unit tests, the SCRUM-72 spec and the full e2e suite; record results (web coverage: no command, n/a)
- [ ] T011 Check semantic tokens only (no raw palette, no arbitrary values) per docs/Frontend-Conventions.md; measure the handwritten diff against `feat/SCRUM-71-admin-company-approval`

## Dependencies

T001 → T003 → T005 → T007; T002 before T003; T004 before T005; T006 before T007; T008/T009 independent of US1.

## Implementation Strategy

US1 is the MVP. Commit after each GREEN: `feat(web): SCRUM-72 ...`, `test(web): SCRUM-72 ...`.
