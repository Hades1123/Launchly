# Implementation Plan: Admin Approves or Rejects Jobs

**Branch**: `feat/SCRUM-73-admin-job-approval` (stacked on SCRUM-71) | **Date**: 2026-11-13 | **Spec**: [spec.md](./spec.md)

**Input**: `specs/005-admin-job-approval/spec.md` (Jira SCRUM-73, subtasks SCRUM-79 shared, SCRUM-80 api)

## Summary

Add `/admin/jobs` (list, get, approve, reject) next to `/admin/companies`, following SCRUM-71's final pattern: one conditional `prisma.job.update({ where: { id, publicationStatus: 'PENDING' } })`, P2025 mapped to 404/409, then a fire-and-forget email to the creator with a fixed log message on failure. The admin DTO extends `recruiterJobSchema`; the service reuses the recruiter job select and mapping, now exported. Resubmitting a rejected job stops clearing `moderationReason`.

## Technical Context

**Language/Version**: TypeScript ~6.0.3, Node

**Primary Dependencies**: Express 5, Zod (`@launchly/shared`), Prisma 7.10.1, `MailProvider`

**Storage**: PostgreSQL; no schema change (uses SCRUM-71's `Job.reviewedById`, `Job.reviewedAt`)

**Testing**: Vitest + supertest with mocked Prisma; one DB test (`RUN_DB_TESTS=1`) for concurrent approvals and public visibility

**Target Platform**: Linux server

**Project Type**: web service (API only; no `apps/web` change, no e2e)

**Performance Goals**: none beyond normal latency

**Constraints**: diff guide ~300 handwritten lines on top of SCRUM-71; coverage gate not available (recorded, option a)

**Scale/Scope**: 4 new endpoints, 1 changed behaviour

## Constitution Check

| Principle                    | Check                                                                                                                           | Status                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| I. Shared Contracts First    | `adminJobSchema`, `adminJobListQuerySchema` in `moderation.ts`; additive                                                        | Pass                   |
| II. Layered Modular Monolith | `modules/admin/admin-job.*` route → controller → service → Prisma; mail through `MailProvider`                                  | Pass                   |
| III. Secure by Default       | `authenticate` + `authorize('ADMIN')` on the router; `validate()` on params, query, body; creator email only in admin responses | Pass                   |
| IV. Tested Business Logic    | TDD per behaviour; DB test for E1. Coverage gate: not available, recorded as a gap (user decision, option a)                    | Pass with recorded gap |
| V. Safe Data Evolution       | No migration                                                                                                                    | Pass                   |
| VI. Simplicity               | Reuses SCRUM-71 email layout, reject schema and decision pattern; reuses recruiter job mapping                                  | Pass                   |

## Project Structure

```text
specs/005-admin-job-approval/   plan.md, research.md, contracts/admin-jobs.md, quickstart.md, checklists/, tasks.md
apps/api/src/
├── app.ts                                   ← mount /admin/jobs
├── modules/admin/
│   ├── admin-job.routes.ts                  ← new
│   ├── admin-job.controller.ts              ← new
│   ├── admin-job.service.ts                 ← new
│   ├── admin-job.test.ts                    ← new
│   └── admin-job.integration.test.ts        ← new (RUN_DB_TESTS)
├── modules/job/
│   ├── recruiter-job.service.ts             ← export jobSelect/toDto; keep reason on SUBMIT
│   └── recruiter-job.test.ts                ← resubmit keeps the reason
└── providers/mail/
    ├── moderation-email-templates.ts        ← job-published, job-rejected kinds
    └── moderation-email-templates.test.ts
packages/shared/src/schemas/
├── moderation.ts                            ← adminJobSchema, adminJobListQuerySchema
└── moderation.test.ts
```

**Structure Decision**: same `modules/admin/` folder as SCRUM-71.

## Complexity Tracking

No violations to justify.
