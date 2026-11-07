# Implementation Plan: Process Rounds Builder for Job Postings

**Branch**: `feat/SCRUM-41-process-rounds-api` then `feat/SCRUM-41-process-rounds-web` (stacked) | **Date**: 2026-11-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-process-rounds-builder/spec.md`

## Summary

A recruiter edits the ordered list of hiring rounds of a job they manage. The list is saved as a whole (replace semantics): array order becomes the stored order position. Shared Zod schemas define the round shape and a draft validator that the web form reuses. The API exposes recruiter-only read and replace endpoints. The web app adds a standalone builder page.

Delivery is split in two stacked pull requests so each stays near the 300-line default:

- **Delivery A (`api`)**: migration, shared schemas and draft validator, API module, tests. About 260 handwritten lines.
- **Delivery B (`web`)**: builder component and page. About 290 handwritten lines. Depends on A.

## Technical Context

**Language/Version**: TypeScript ~6.0.3, Node.js 22 LTS

**Primary Dependencies**: Express 5, Prisma 7.10.1 (`@prisma/adapter-pg`), Next.js 16 (App Router), React 19, Tailwind CSS, Zod, Vitest, Supertest. No new dependencies.

**Storage**: PostgreSQL 17 via Prisma. Two nullable columns on the existing `JobStage` table.

**Testing**: Vitest in `packages/shared` and `apps/api` (Supertest for endpoints); a `RUN_DB_TESTS=1` gated integration test for locking, ordering and the in-use guard.

**Target Platform**: Node.js API, responsive browser UI.

**Project Type**: Monorepo: `apps/api`, `apps/web`, `packages/shared`.

**Performance Goals**: Not performance-critical; at most 10 rounds per job, one transaction per save.

**Constraints**: Gapless positions despite the unique `(jobId, position)` index; concurrent saves must serialise; a round referenced by applications must never be deleted silently.

**Scale/Scope**: One recruiter edits one job at a time; at most 10 rounds.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Status |
| :--- | :--- | :--- |
| I. Shared Contracts First | Request and response shapes are Zod schemas in `@launchly/shared`; the web form reuses them | Pass: `job-round.ts` holds schemas and `validateRoundDrafts`; web imports both |
| II. Layered Modular Monolith | route, controller, service, Prisma in `apps/api/src/modules/job/` | Pass: `job-rounds.{routes,controller,service}.ts` |
| III. Secure by Default | Server-side validation, role and ownership checks | Pass: `authenticate`, `authorize('RECRUITER')`, owner check in the service, `validate({ params, body })` |
| IV. Tested Business Logic | Tests for success and failure paths; red then green recorded | Pass by plan: tasks require RED evidence per task, recorded in `tasks.md` |
| V. Safe Data Evolution | Prisma migration committed; no edits to old migrations | Pass: one new additive migration ordered after the existing ones |
| VI. Simplicity | No new dependencies, no speculative features | Pass: replace-whole-list instead of per-round endpoints; move buttons instead of drag and drop |

No violations; Complexity Tracking not needed.

## Project Structure

### Documentation (this feature)

```text
specs/003-process-rounds-builder/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/rounds.contract.md
├── tasks.md
└── checklists/requirements.md
```

### Source Code

```text
apps/api/prisma/
├── schema.prisma                                  # JobStage.format, estimatedDurationMinutes
└── migrations/20261107120000_job_round_format_and_duration/
apps/api/src/
├── app.ts                                         # mount rounds router
└── modules/job/
    ├── job-rounds.service.ts
    ├── job-rounds.controller.ts
    ├── job-rounds.routes.ts
    ├── job-rounds.test.ts                         # supertest, mocked Prisma
    └── job-rounds.integration.test.ts             # gated by RUN_DB_TESTS=1
packages/shared/src/
├── index.ts
└── schemas/{job-round.ts, job-round.test.ts}
apps/web/src/
├── app/recruiter/jobs/[id]/rounds/page.tsx
└── components/recruiter/rounds-builder.tsx
```

**Structure Decision**: Existing monorepo layout; the rounds code sits beside the job module. Delivery A covers `apps/api` and `packages/shared`; Delivery B covers `apps/web`.
