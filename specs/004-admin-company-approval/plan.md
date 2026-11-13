# Implementation Plan: Admin Approves or Rejects Companies

**Branch**: `feat/SCRUM-71-admin-company-approval` | **Date**: 2026-11-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/004-admin-company-approval/spec.md` (Jira SCRUM-71, subtasks SCRUM-75 db, SCRUM-76 shared, SCRUM-77 api)

## Summary

Add an admin-only API to list, view, approve and reject companies. A decision is a conditional update that only applies while the company is `PENDING` (409 otherwise), records the reviewer and time, and then emails the owner without waiting; a mail failure is logged. The recruiter's own company record gains the rejection reason, `GET /companies/me` returns the newest company, and `POST /companies` only refuses when a `PENDING` or `APPROVED` company exists. One migration adds `reviewedById` / `reviewedAt` to `Company` and `Job` (Job reuses them in SCRUM-73).

## Technical Context

**Language/Version**: TypeScript ~6.0.3, Node (pnpm monorepo)

**Primary Dependencies**: Express 5, Zod (`@launchly/shared`), Prisma 7.10.1 with `PrismaPg`, nodemailer / SES behind `MailProvider`

**Storage**: PostgreSQL (two nullable columns and one FK per table on `Company` and `Job`)

**Testing**: Vitest + supertest with a mocked Prisma client (pattern of `company.routes.test.ts`); one DB-backed integration test behind `RUN_DB_TESTS=1` for the double decision

**Target Platform**: Linux server (API container)

**Project Type**: web service (API only; no `apps/web` change, so no Playwright e2e)

**Performance Goals**: none beyond normal request latency; MVP volume is small

**Constraints**: handwritten diff ≤ ~300 lines (excluding migration SQL, lockfile, `specs/**`); coverage gate command missing (recorded as not available, user override)

**Scale/Scope**: 4 new endpoints, 2 changed endpoints, 1 migration

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                              | Check                                                                                                                                                                                             | Status                 |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| I. Shared Contracts First              | Request and response shapes are Zod schemas in `packages/shared/src/schemas/moderation.ts`; `companyDtoSchema` gains an optional-null field (additive, not breaking)                              | Pass                   |
| II. Layered Modular Monolith           | New `modules/admin/` with route → controller → service → Prisma; mail through the `MailProvider` abstraction                                                                                      | Pass                   |
| III. Secure by Default                 | Every `/admin/*` route uses `authenticate` + `authorize('ADMIN')`; input validated with `validate()`; owner email only in admin responses (FR-013)                                                | Pass                   |
| IV. Tested Business Logic              | TDD per behaviour; supertest for every E-id; DB test for E1. Coverage gate: **not available** (no `test:coverage` / `coverage:changed`), recorded as a gap by user override, as in PRs #21 to #24 | Pass with recorded gap |
| V. Safe Data Evolution                 | Additive migration (nullable columns, `ON DELETE SET NULL`); no edits to committed migrations                                                                                                     | Pass                   |
| VI. Simplicity and Pinned Dependencies | No new dependencies; no audit table; no retries                                                                                                                                                   | Pass                   |

Post-design re-check: unchanged, all pass (IV with the recorded coverage gap).

## Project Structure

### Documentation (this feature)

```text
specs/004-admin-company-approval/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/admin-companies.md
├── checklists/requirements.md, checklists/api-security.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
apps/api/prisma/
├── schema.prisma                                   ← reviewedById, reviewedAt, reviewer relations
└── migrations/<ts>_moderation_review_audit/        ← new
apps/api/src/
├── app.ts                                          ← mount /admin/companies, optional mail param
├── modules/admin/
│   ├── admin-company.routes.ts                     ← new
│   ├── admin-company.controller.ts                 ← new
│   ├── admin-company.service.ts                    ← new
│   ├── admin-company.test.ts                       ← new (supertest, mocked Prisma)
│   └── admin-company.integration.test.ts           ← new (RUN_DB_TESTS)
├── modules/company/
│   ├── company.service.ts                          ← create guard, getMine order, moderationReason
│   └── company.routes.test.ts                      ← E5, E6, reason in /me
└── providers/mail/
    ├── moderation-email-templates.ts               ← new
    └── moderation-email-templates.test.ts          ← new
packages/shared/src/
├── schemas/moderation.ts                           ← new
├── schemas/moderation.test.ts                      ← new
├── schemas/company.ts                              ← moderationReason on companyDtoSchema
└── index.ts                                        ← export
```

**Structure Decision**: existing pnpm monorepo layout; admin endpoints live in a new `modules/admin/` feature folder so SCRUM-73 adds `admin-job.*` next to them.

## Complexity Tracking

No violations to justify.
