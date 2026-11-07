# Implementation Plan: Salary Visibility Control for Public Job Data

**Branch**: `feat/SCRUM-38-salary-visibility` | **Date**: 2026-11-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-salary-visibility/spec.md`

## Summary

Job search (SCRUM-28) is merged on main in `apps/api/src/modules/job/` and leaks raw `salaryMin/salaryMax`. Hide-salary flag, shared `publicSalarySchema` and `toPublicSalary` mapper already exist on this branch. Remaining: (1) switch search items to `salary: PublicSalary` via the mapper (breaking, web list updated); (2) extract the search visibility rule into one exported `publicJobWhere`; (3) add minimal public `GET /jobs/:id` in the same module using both; (4) tests and a docs note. Recruiter write path (SCRUM-40) is out of scope.

## Technical Context

**Language/Version**: TypeScript ~6.0.3, Node.js 22

**Primary Dependencies**: Express 5, Zod 4, Prisma 7.10.1 (PrismaPg)

**Storage**: PostgreSQL 17 (`Job.salaryHidden`, migration already committed)

**Testing**: Vitest; supertest on `createApp()` with mocked `@/lib/prisma`; optional `RUN_DB_TESTS=1` integration

**Target Platform**: API service (`apps/api`), contract in `packages/shared`

**Project Type**: web-service (pnpm monorepo)

**Performance Goals**: one indexed primary-key query per request

**Constraints**: never return salary figures when hidden; hidden/unpublished jobs are indistinguishable from unknown ids

**Scale/Scope**: one endpoint, one schema file, one service

## Constitution Check

| Principle | Status |
| --- | --- |
| I Shared contracts | Pass: `publicJobDetailSchema`/`jobIdParamsSchema` in `@launchly/shared`; params validated before controller; Prisma types mapped, not exposed |
| II Layered monolith | Pass: route → controller → service → Prisma in `modules/jobs/`; `@/` imports |
| III Secure by default | Pass: `select` whitelist, identical 404, Zod-validated id; no auth needed for public read |
| IV Tested | Pass: RED→GREEN tests for success, hidden, 404 matrix, invalid id |
| V Safe data evolution | Pass: migration already committed, not edited |
| VI Simplicity | Pass: no new deps; detail limited to SCRUM-38 needs (rounds/notes left to SCRUM-29) |

Post-design re-check: Pass. No Complexity Tracking entries.

## Project Structure

```text
specs/002-salary-visibility/
├── plan.md  research.md  data-model.md  quickstart.md  tasks.md
└── contracts/public-job-detail.md

packages/shared/src/schemas/job.ts          # edit: item.salary, add publicJobDetailSchema, jobIdParamsSchema
apps/api/src/modules/job/{job.service,job.controller,job.routes}.ts   # edit: salary mapping, publicJobWhere, getById
apps/api/src/modules/job/job.test.ts        # edit/extend
apps/api/src/modules/job/job-salary.ts      # exists
apps/web/src/app/(main)/jobs/page.tsx, components/jobs/job-list-card.tsx   # render Negotiable
docs/Backend-Conventions.md                 # "Public job visibility"
```

**Structure Decision**: existing monorepo layout; extends the existing `job` module.

## Complexity Tracking

None.
