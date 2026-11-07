# Implementation Plan: Backend Conventions and API Foundation

**Branch**: `feat/SCRUM-33-backend-conventions` | **Date**: 2026-11-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-backend-conventions/spec.md`

**Jira**: SCRUM-33 (parent epic SCRUM-7; blocks SCRUM-23) — `https://hcmut-team-vmaq1hvy.atlassian.net/browse/SCRUM-33`

## Summary

Establish the `apps/api` conventions and the minimal foundation code that enforces them so every later module (starting with auth, SCRUM-23) reuses one error contract, one validation boundary, and one module shape. Deliverables: a shared `apiErrorSchema` error contract in `@launchly/shared`; an `AppError` class with a code→status map and a Zod-issue mapping helper; a rewritten central error handler that maps every failure to the contract and never leaks internals; a `validate()` middleware for body/params/query; a JSON `notFound` handler; the `/health` endpoint refactored into the reference module; `docs/Backend-Conventions.md` plus guidance-file updates; and a test environment that runs with no `.env` and no database. No new dependencies; changes to `apps` + `packages` stay ≤300 insertions+deletions.

## Technical Context

**Language/Version**: TypeScript `~6.0.3` (pinned), Node.js (ESM via `tsx`/`tsup`)

**Primary Dependencies**: Express 5.3.0, zod 4, body-parser (bundled with Express), `@launchly/shared` (source-only). Test: Vitest + supertest (already installed). No new runtime or dev dependency is added.

**Storage**: N/A for this feature — the foundation routes (`/health`, error paths) do not touch Prisma/PostgreSQL; the API must boot and its tests must run without a database.

**Testing**: Vitest (`vitest run --passWithNoTests`), supertest against `createApp()`; colocated `*.test.ts`. Test env supplied via `vitest.config.ts` (no `.env`, no DB).

**Target Platform**: Express REST API (`apps/api`), consumed by the Next.js web app through the `/api/*` rewrite and by future clients.

**Project Type**: Web application monorepo (pnpm): `apps/api` (Express), `apps/web` (Next.js), `packages/shared` (Zod schemas). This feature touches `apps/api` and `packages/shared`.

**Performance Goals**: N/A — no hot path introduced; error handling and validation are per-request glue. No benchmark required (none exists; no metrics stack).

**Constraints**: No new dependencies (lockfile and `package.json` files unchanged). `apps`+`packages` diff ≤300 insertions+deletions (excluding `specs/` and `docs/`). 500 responses must expose no message/stack/detail/secret. Tests run with no `.env` and no DB.

**Scale/Scope**: Foundation-only: 1 shared schema module, 1 error class + status map, 1 error handler rewrite, 1 validate middleware, 1 not-found middleware, 1 reference module (health), 1 docs file + 2 guidance-file edits, colocated tests. Reserved codes (`UNAUTHORIZED`, `FORBIDDEN`, `RATE_LIMITED`) defined now, exercised by later tickets.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                              | Status        | How this plan satisfies it                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Shared Contracts First              | ✅ Pass       | The error contract is defined once in `@launchly/shared` (`apiErrorSchema`) with `z.infer` types; the API imports it and the web app will reuse it. No Prisma types cross the boundary. `validate()` enforces body/params/query validation before the controller. The old 400/500 bodies were not shared schemas and have no consumer, so the change is non-breaking (called out in the PR per D2). |
| II. Layered Modular Monolith           | ✅ Pass       | `/health` becomes `modules/health/` (routes → controller; no service because it has no logic/data). Error/validate/not-found live in `middlewares/`. No new abstraction layer; `providers/` untouched. `@/` alias used.                                                                                                                                                                             |
| III. Secure by Default                 | ✅ Pass       | One consistent error format; 500s expose only a generic code+message (no stack/SQL/secret/detail); 4xx not logged; secrets never placed in messages or logs. External input validated with Zod at the boundary via `validate()`.                                                                                                                                                                    |
| IV. Tested Business Logic              | ✅ Pass       | Every error-producing behaviour ships with Vitest + supertest tests following red→green; each error test asserts `apiErrorSchema.parse(res.body)`. Config-only task (test env) is exempt but still passes typecheck/lint.                                                                                                                                                                           |
| V. Safe Data Evolution                 | ✅ Pass (N/A) | No schema, migration, `env.ts`, or Prisma change. No `migrate reset`/`db push`.                                                                                                                                                                                                                                                                                                                     |
| VI. Simplicity and Pinned Dependencies | ✅ Pass       | No new dependency; no speculative abstraction (no `asyncHandler`, no error factories — YAGNI). Pinned versions untouched.                                                                                                                                                                                                                                                                           |

**Result**: PASS. No deviations → **Complexity Tracking is empty**.

## Project Structure

### Documentation (this feature)

```text
specs/001-backend-conventions/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (error + health contracts)
├── checklists/
│   ├── requirements.md  # spec-quality checklist (/speckit-specify, /speckit-clarify)
│   └── api-contract.md  # requirements-quality review checklist (/speckit-checklist)
└── tasks.md             # /speckit-tasks output (next command)
```

### Source Code (repository root)

```text
packages/shared/src/
├── index.ts                     # add: export * from './schemas/error'
└── schemas/
    ├── error.ts                 # NEW: errorCodeSchema, errorDetailSchema, apiErrorSchema (+ types)
    └── error.test.ts            # NEW: contract tests (T2)

apps/api/
├── vitest.config.ts             # EDIT: add test.env block (no .env, no DB) (T1)
└── src/
    ├── app.ts                   # EDIT: mount healthRouter, notFound, errorHandler (D7)
    ├── lib/
    │   └── app-error.ts         # NEW: errorStatus map, AppError, zodIssuesToDetails (D3)
    ├── middlewares/
    │   ├── error-handler.ts     # REWRITE: map to apiErrorSchema, no leaks (D4)
    │   ├── error-handler.test.ts# NEW (T3)
    │   ├── validate.ts          # NEW: validate({body,params,query}) (D5)
    │   ├── validate.test.ts     # NEW (T5)
    │   └── not-found.ts         # NEW: notFound → AppError('NOT_FOUND') (D6)
    ├── modules/health/
    │   ├── health.routes.ts     # NEW: healthRouter (D7)
    │   └── health.controller.ts # NEW: getHealth (D7)
    └── app.test.ts              # EDIT/NEW: 404, malformed JSON, oversized, /health regression (T3,T4)

docs/Backend-Conventions.md      # NEW (T6)
AGENTS.md, README.md             # EDIT: reflect tests + conventions (T6)
```

**Structure Decision**: Web-application monorepo. This feature adds the shared error contract under `packages/shared/src/schemas/` and the API foundation under `apps/api/src/{lib,middlewares,modules/health}`, following the constitution's route → controller → service layering (health needs no service). Cross-cutting middleware stays in `middlewares/`; the typed-error primitive and status map stay in `lib/`.

## Complexity Tracking

> No Constitution Check violations. No entries.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| _(none)_  | —          | —                                    |
