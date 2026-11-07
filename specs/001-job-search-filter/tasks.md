# Tasks: Search and Filter Jobs

**Input**: Design documents from `/specs/001-job-search-filter/`

**Prerequisites**: [spec.md](spec.md), [plan.md](plan.md), [data-model.md](data-model.md), [contracts/job-search.contract.md](contracts/job-search.contract.md), [research.md](research.md), [quickstart.md](quickstart.md)

**Tests**: Tests are mandatory per Constitution Principle IV (TDD red-green-refactor with Vitest and supertest).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (independent files, no blocking dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

---

## Phase 1: Setup & Foundational Prerequisites

**Purpose**: Core shared constants, Zod schemas, Vietnamese text normalization, database schema, and seed data

- [x] T001 [P] Define `JOB_LEVELS`, `JOB_INDUSTRIES`, and `JOB_LOCATIONS` lookup constants in `packages/shared/src/constants/job.ts`.
- [x] T002 [P] Define `jobFilterQuerySchema`, `publicJobItemSchema`, and `publicJobListResponseSchema` in `packages/shared/src/schemas/job.ts` and export them from `packages/shared/src/index.ts`.
- [x] T003 [P] Implement Vietnamese diacritic normalization utility `normalizeVietnamese()` in `packages/shared/src/utils/vietnamese.ts` and unit tests in `packages/shared/src/utils/vietnamese.test.ts`.
- [x] T004 Update Prisma schema in `apps/api/prisma/schema.prisma` adding `industry` and `titleNormalized` to `Job`, and `nameNormalized` to `Company`, along with B-tree indices.
- [x] T005 Create and apply migration `20261107062800_scrum_28_job_search_filters` via `prisma migrate dev` and regenerate Prisma client with `pnpm --filter @launchly/api db:generate`.
- [x] T006 Update seed data in `apps/api/prisma/seed/data.ts` with valid job levels (`INTERN`, `FRESHER`, `SENIOR`), normalized titles, company names, and diverse test roles.

---

## Phase 2: User Story 1 & 5 - Public Job Listing and Multi-Criteria Filtering (Priority: P1) 🎯 MVP

**Goal**: Provide public guest access to approved jobs with combined filtering by career level, industry, and location.

**Independent Test**: Send `GET /jobs?level=INTERN&industry=Technology` and verify that only approved published jobs matching all selected criteria are returned.

### Tests for User Story 1 & 5
- [x] T007 [US1] Write automated test cases in `apps/api/src/modules/job/job.test.ts` for public listing rule (published jobs and approved companies only) and filtering by career level (`INTERN`, `FRESHER`, `SENIOR`).
- [x] T008 [US1] Write automated test cases in `apps/api/src/modules/job/job.test.ts` for filtering by industry and location combined, and verifying 400 `VALIDATION_ERROR` on invalid level.

### Implementation for User Story 1 & 5
- [x] T009 [US1] Implement `JobService.searchJobs` in `apps/api/src/modules/job/job.service.ts` with dynamic `AND` query builder enforcing public listing rules and multi-criteria filters.
- [x] T010 [US1] Implement `JobController.searchJobs` in `apps/api/src/modules/job/job.controller.ts`.
- [x] T011 [US1] Implement `apps/api/src/modules/job/job.routes.ts` with `validate({ query: jobFilterQuerySchema })` and mount routes `/jobs` and `/api/jobs` in `apps/api/src/app.ts`.

---

## Phase 3: User Story 2 - Accent-Tolerant and Case-Insensitive Keyword Search (Priority: P1)

**Goal**: Enable candidates to search jobs matching title or company name, without case sensitivity or diacritics.

**Independent Test**: Send `GET /jobs?keyword=lap+trinh` and verify it successfully returns jobs titled "Lập trình viên Backend Node.js".

### Tests for User Story 2
- [x] T012 [US2] Write automated tests in `apps/api/src/modules/job/job.test.ts` for accent-tolerant Vietnamese keyword search and company name keyword matching.

### Implementation for User Story 2
- [x] T013 [US2] Update `JobService.searchJobs` to construct an `OR` condition matching raw keyword against `title`/`company.name` and normalized keyword against `titleNormalized`/`company.nameNormalized`.

---

## Phase 4: User Story 3 - Paginated Results with URL Query State (Priority: P1)

**Goal**: Paginate search results with metadata (`page`, `limit`, `total`, `totalPages`) and maintain state in the URL query string.

**Independent Test**: Send `GET /jobs?page=2&limit=10` and verify pagination metadata and record slice calculations.

### Tests for User Story 3
- [x] T014 [US3] Write automated tests in `apps/api/src/modules/job/job.test.ts` verifying pagination parameters `page`, `limit`, total records count, and `totalPages` calculation.

### Implementation for User Story 3
- [x] T015 [US3] Implement pagination logic in `JobService.searchJobs` utilizing Prisma `skip`, `take`, and `count`.

---

## Phase 5: User Story 4 - Empty Results State and Filter Reset (Priority: P2)

**Goal**: Gracefully handle queries matching zero jobs and provide clear feedback and filter reset action.

**Independent Test**: Send `GET /jobs?keyword=nonexistent` and assert `{ data: [], pagination: { total: 0 } }`.

### Tests for User Story 4
- [x] T016 [US4] Write automated tests in `apps/api/src/modules/job/job.test.ts` verifying empty result payload when no records match.

---

## Phase 6: Frontend UI Implementation

**Purpose**: Responsive job discovery screen in Next.js with semantic design tokens and URL sync

- [x] T017 [P] Build `JobFilters` component in `apps/web/src/components/jobs/job-filters.tsx` supporting keyword search input, level radio chips, industry and location select dropdowns, and reset link.
- [x] T018 [P] Build `JobListCard` component in `apps/web/src/components/jobs/job-list-card.tsx` rendering title, company initials, level badge, location, salary range, and skill tags with semantic design tokens.
- [x] T019 Implement Server Component discovery page in `apps/web/src/app/(main)/jobs/page.tsx` fetching from `/jobs`, rendering job list, empty state with filter reset action, pagination controls with URL query synchronization, and job detail preview.

---

## Phase 7: Polish & Quality Gates Verification

**Purpose**: Verify all quality gates, linter rules, and design tokens across the repository

- [x] T020 Run `pnpm lint` and resolve any unused variables or formatting inconsistencies.
- [x] T021 Run `pnpm typecheck` across `@launchly/shared`, `@launchly/api`, and `@launchly/web`.
- [x] T022 Run `pnpm test` verifying 100% pass rate across all workspace test suites (107 tests passing).
- [x] T023 Run design token audit verifying zero arbitrary style classes or raw color palette utilities in `apps/web/src`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup & Foundational (Phase 1)**: Core prerequisites (shared schemas, database schema & migration, seed data).
- **User Story 1 & 5 (Phase 2)**: Core API endpoint and public listing rules.
- **User Story 2 (Phase 3)**: Keyword search integrated into `JobService`.
- **User Story 3 & 4 (Phase 4 & 5)**: Pagination and empty state handling.
- **Frontend UI (Phase 6)**: Builds user interface consuming the public job endpoint.
- **Polish & Quality Gates (Phase 7)**: Repository-wide verification across all packages.

---

## Implementation Strategy

### MVP First (User Story 1 & 5)
1. Complete shared schemas and database migration.
2. Deliver public job listing with multi-criteria filtering on backend.
3. Validate with automated tests.

### Incremental Delivery
1. Add accent-tolerant Vietnamese keyword search (US2).
2. Add pagination and URL query string synchronization (US3).
3. Add empty state handling and reset button (US4).
4. Build Next.js responsive UI and verify against all quality gates.
