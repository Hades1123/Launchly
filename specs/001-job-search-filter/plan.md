# Implementation Plan: Search and Filter Jobs

**Branch**: `feat/SCRUM-28-search-filter-jobs` | **Date**: 2026-11-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-job-search-filter/spec.md`

## Summary

Implement the public job discovery service, keyword search, combined multi-criteria filters, and responsive UI for Launchly.
The solution follows the Launchly Constitution strictly:
- Shared request query schemas, constants, response DTOs, and Vietnamese accent-normalization utilities defined in `@launchly/shared`.
- Modular layered backend in `apps/api/src/modules/job/` (routes, controller, service, Prisma).
- Server-side enforcement of the public listing rule: only jobs with `publicationStatus = PUBLISHED` belonging to companies with `moderationStatus = APPROVED` are accessible.
- Accent-tolerant and case-insensitive keyword search on job titles and company names using normalized database columns (`titleNormalized`, `nameNormalized`) with B-tree indices for fast queries without relying on raw SQL.
- Server-rendered Next.js page in `apps/web/src/app/(main)/jobs/page.tsx` with semantic design tokens, responsive filter form, and bidirectional URL query string synchronization.

## Technical Context

**Language/Version**: TypeScript ~6.0.3, Node.js 22 LTS

**Primary Dependencies**: Express 5, Prisma 7.10.1 (`@prisma/adapter-pg`), Next.js 16 (App Router), React 19, Tailwind CSS, Zod 3.x, Vitest, Supertest

**Storage**: PostgreSQL 17 (host port 5433 via Prisma ORM)

**Testing**: Vitest (`pn test` / `pn --filter @launchly/api test`) with `supertest` for API routes and query validation

**Target Platform**: Node.js backend (Linux/Windows/macOS), Modern responsive web browsers (Next.js App Router)

**Project Type**: Monorepo with `apps/api`, `apps/web`, and `packages/shared`

**Performance Goals**: Job search and filtered queries < 100ms p95; database index lookups < 20ms

**Constraints**: Accent-tolerant Vietnamese diacritic matching; server-side public listing rule enforcement; zero arbitrary style classes; responsive layout on mobile without horizontal scrolling

**Scale/Scope**: Public job discovery supporting hundreds of active opportunities, paginated in batches of 10

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Compliance Status |
| :--- | :--- | :--- |
| **I. Shared Contracts First** | Request query and response shapes defined as Zod schemas in `@launchly/shared` | Passed: Defined in `packages/shared/src/schemas/job.ts` and constants in `constants/job.ts` |
| **II. Layered Modular Monolith** | Route -> Controller -> Service -> Prisma in `apps/api/src/modules/job/` | Passed: Clean isolation in `apps/api/src/modules/job/` with route validation |
| **III. Secure by Default** | Server-side validation of query parameters; strict public listing rule | Passed: `validate({ query: jobFilterQuerySchema })` middleware; draft/rejected/closed jobs and unapproved companies filtered server-side |
| **IV. Tested Business Logic** | Automated tests for search, filters, pagination, and failure paths | Passed: 8 comprehensive unit and integration tests in `apps/api/src/modules/job/job.test.ts` |
| **V. Safe Data Evolution** | Database changes through committed reviewable Prisma migrations only | Passed: Migration `20261107062800_scrum_28_job_search_filters` committed and verified |
| **VI. Simplicity** | Minimal necessary implementation without speculative complexity | Passed: Normalized string column matching with B-tree index, avoiding unneeded search cluster infrastructure |

## Project Structure

### Documentation (this feature)

```text
specs/001-job-search-filter/
├── spec.md                  # Feature specification
├── plan.md                  # Implementation plan (this file)
└── checklists/
    └── requirements.md      # Specification quality checklist
```

### Source Code (repository root)

```text
packages/shared/src/
├── constants/
│   └── job.ts               # Shared lookup lists: JOB_LEVELS, JOB_INDUSTRIES, JOB_LOCATIONS
├── schemas/
│   └── job.ts               # jobFilterQuerySchema, publicJobItemSchema, publicJobListResponseSchema
├── utils/
│   ├── vietnamese.ts        # normalizeVietnamese() diacritics removal utility
│   └── vietnamese.test.ts   # Unit tests for diacritic normalization
└── index.ts                 # Central barrel export

apps/api/
├── prisma/
│   ├── schema.prisma        # Job (industry, titleNormalized), Company (nameNormalized) + indexes
│   ├── migrations/          # 20261107062800_scrum_28_job_search_filters
│   └── seed/
│       └── data.ts          # Seed jobs across Intern, Fresher, Senior and various industries
├── src/
│   ├── modules/
│   │   └── job/
│   │       ├── job.routes.ts     # GET / with validate({ query })
│   │       ├── job.controller.ts # Request/response serialization
│   │       ├── job.service.ts    # Filter composition, Prisma query, pagination
│   │       └── job.test.ts       # Vitest tests covering all filtering and search cases
│   └── app.ts               # Mounts /jobs and /api/jobs

apps/web/src/
├── components/jobs/
│   ├── job-filters.tsx      # Keyword input, level chips, industry & location select boxes, reset
│   ├── job-list-card.tsx    # Card presenting position, company, location, level, salary, skills
│   └── job-detail.tsx       # Detail preview panel
└── app/(main)/jobs/
    └── page.tsx             # Server component: fetches from /jobs, renders list, empty state, pagination
```

**Structure Decision**: Monorepo layered architecture adhering strictly to Launchly Constitution Principles I, II, and III.

## Complexity Tracking

> **Constitution check passes with zero violations.** No complexity exemptions required.
