---
description: 'Task list for SCRUM-74 admin moderation page for jobs'
---

# Tasks: Admin Moderation Page for Jobs

**Input**: `specs/007-admin-job-moderation-page/`

**Tests**: TDD with Playwright: write the e2e tests, run RED (missing UI, not a setup error), build, run GREEN.

## Phase 1: Foundational

- [x] T001 Add `listAdminJobs(status)`, `getAdminJob(id)`, `approveJob(id)`, `rejectJob(id, reason)` in apps/web/src/lib/api/admin-jobs.ts, parsing with `adminJobSchema`
- [x] T002 Extend the `moderation` command in apps/api/prisma/e2e-reset.ts to delete jobs whose title starts with "E2E moderation" (with their rounds and notes)

## Phase 2: User Story 1 - Admin reviews and decides on a job (P1) 🎯 MVP

- [x] T003 [US1] Write apps/web/e2e/scrum-74-admin-job-moderation.spec.ts (demo mode, `beforeEach`/`afterAll` `resetModeration()`, a helper that submits "E2E moderation <id>" as `recruiter.fpt@launchly.test` with two rounds and two notes): AC1 Jobs tab lists it with company, level and "Gửi lúc"; AC2 review page shows description, rounds in order with format and duration, notes in order and creator email; AC3 approve → "Đã duyệt" and `/jobs/:id` opens; AC4 reject with a reason → "Bị từ chối" + reason; E1 decided via the API first → "Mục này đã được xử lý"; E2 with no pending jobs (seeded one approved via the API) → "Không có mục nào cần duyệt"; E3 the seeded job without notes shows no "Notes from the company"; run RED
- [x] T004 [US1] Add the "Tin tuyển dụng" tab in apps/web/src/components/admin/moderation-tabs.tsx, apps/web/src/components/admin/pending-job-list.tsx and apps/web/src/app/admin/moderation/jobs/page.tsx; GREEN for AC1, E2
- [x] T005 [US1] Build apps/web/src/components/admin/job-review.tsx and apps/web/src/app/admin/moderation/jobs/[id]/page.tsx (timeline via `buildProcessView`, `RejectDialog`, CONFLICT reload); GREEN for AC2 to AC4, E1, E3

## Phase 3: User Story 2 - Resubmitted job (P2)

- [x] T006 [US2] Add e2e test E4: reject via the admin API, resubmit via `PUT /recruiter/jobs/:id` as the recruiter, open as admin → "Đã từ chối trước đó" + reason; run RED
- [x] T007 [US2] Show "Đã từ chối trước đó" with `moderationReason` for a PENDING job in job-review.tsx; GREEN

## Phase 4: Polish

- [x] T008 Run typecheck, lint, unit tests, the SCRUM-74 spec and the full e2e suite; record (web coverage n/a)
- [x] T009 Check semantic tokens only; measure the handwritten diff against `feat/SCRUM-72-admin-company-moderation-page` excluding SCRUM-73 files

## Dependencies

T001, T002 → T003 → T004 → T005; T006 → T007 after T005.
