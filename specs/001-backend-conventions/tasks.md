---
description: 'Task list for Backend Conventions and API Foundation (SCRUM-33)'
---

# Tasks: Backend Conventions and API Foundation

**Input**: Design documents from `/specs/001-backend-conventions/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Jira**: SCRUM-33 — this ledger reproduces the issue's authoritative tasks **T1–T7** (same files, order, and RED→GREEN steps). Task IDs `T001`–`T007` map 1:1 to issue `T1`–`T7`.

**Tests**: REQUIRED. Constitution Principle IV and the issue mandate red → green for every observable behaviour; each error test asserts `apiErrorSchema.parse(res.body)`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story the task serves (US1, US2, US3)
- Exact file paths are included in every task

## Ledger rules (from the issue)

- Tick a task only after it is **verified** on the revision; leave blocked/skipped/human-only/unverified tasks unchecked. Only a person ticks the `checklists/` items.
- RED rule: for a brand-new module, first add a compile-only stub with the final export names, so RED fails on an **assertion**, not an import/setup error (constitution L107–110). Capture RED and GREEN output for the PR.
- Every commit leaves the project buildable and tests green; never commit a RED-only state.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Make the API test suite runnable with no `.env` and no database.

- [X] T001 (issue T1, R7) Add the `test.env` block to `apps/api/vitest.config.ts` (`NODE_ENV=test`, placeholder `DATABASE_URL`, ≥32-char `JWT_SECRET` and `JWT_REFRESH_SECRET`) so `src/lib/env.ts`'s import-time `parse` succeeds without a real env or DB. Config-only (exempt from RED→GREEN per constitution L111). **Verify**: `pn --filter @launchly/api test` exits 0; stop if env parsing still fails.

**Checkpoint**: Tests boot with no `.env` / no database.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared error contract every later task depends on.

**⚠️ CRITICAL**: No error-mapping, 404, or validation work can be verified until this is complete.

- [X] T002 [P] (issue T2, R1) Shared error contract in `packages/shared/src/schemas/error.ts` (exported via `packages/shared/src/index.ts` with `export * from './schemas/error';`).
  - RED: write `packages/shared/src/schemas/error.test.ts` against a stub `error.ts` (`errorCodeSchema = z.string()`, `errorDetailSchema = z.any()`, `apiErrorSchema = z.any()`); assert a valid error parses, an **unknown code is rejected** (this assertion fails RED), and `details` is optional. Record RED output.
  - GREEN: replace the stub with the D1 definition verbatim (`errorCodeSchema` 8-value enum, `errorDetailSchema`, `apiErrorSchema`, plus `z.infer` types) and add the `index.ts` export.
  - **Verify**: `pn --filter @launchly/shared test` and `pn typecheck`. Commit as `feat(shared): SCRUM-33 add shared API error contract`.

**Checkpoint**: `apiErrorSchema` importable by both apps; contract tests green.

---

## Phase 3: User Story 1 — Consistent, safe error responses (Priority: P1) 🎯 MVP

**Goal**: Every failure (validation, malformed/oversized body, conflict, unknown route, server fault) returns the shared error shape and never leaks internals.

**Independent Test**: Drive each failure category against an app built with the new handler/404 and assert correct code+status and `apiErrorSchema.parse(res.body)`; assert a 500 body leaks no message/stack/secret.

- [X] T003 (issue T3, R2+R3) `AppError` + status map + mapping helper, and the error-handler rewrite.
  - Files: `apps/api/src/lib/app-error.ts` (new), `apps/api/src/middlewares/error-handler.ts` (rewrite), `apps/api/src/middlewares/error-handler.test.ts` (new), and additions to `apps/api/src/app.test.ts`.
  - RED: write `error-handler.test.ts` building its own `express()` app (`express.json()`, test routes, `errorHandler`) with a stub `AppError` that has no status mapping, asserting: async route throwing `new AppError('CONFLICT','Email already registered')` → 409 body `{error:{code:'CONFLICT',message:'Email already registered'}}`; route doing `loginSchema.parse({})` → 400 `VALIDATION_ERROR` with a detail path `['email']`; route throwing `new Error('db password=secret')` → 500 body exactly `{error:{code:'INTERNAL_ERROR',message:'Internal server error'}}`, `res.text` excludes `secret`, no `stack` key. Add to `app.test.ts`: POST `/health` with `Content-Type: application/json` body `{bad` → confirm RED returns 500 (not 404), target 400 `VALIDATION_ERROR`; a >100kb JSON string field → target 413 `PAYLOAD_TOO_LARGE`. Record RED output.
  - GREEN: implement D3 (`errorStatus` map; `AppError` with readonly `code`/`status`/`details?`, `name='AppError'`; `zodIssuesToDetails` stringifying symbol keys) and D4 (handler order: `headersSent`→`next`; 4xx `AppError`; `ZodError`→400 `Invalid request`; `entity.parse.failed`→400 `Malformed JSON body`; `entity.too.large`→413 `Request body too large`; else `console.error`+generic 500; 4xx not logged; bodies built only from the contract).
  - **Verify**: targeted + `pn typecheck`. Commit as `feat(api): SCRUM-33 add AppError and contract-mapping error handler`.
- [X] T004 (issue T4, R4+R5) JSON 404 and the health reference module, wired into `app.ts`.
  - Files: `apps/api/src/middlewares/not-found.ts` (new), `apps/api/src/modules/health/health.routes.ts` (new), `apps/api/src/modules/health/health.controller.ts` (new), `apps/api/src/app.ts` (edit), additions to `apps/api/src/app.test.ts`.
  - RED: in `app.test.ts`, GET `/does-not-exist` → currently Express HTML, so `apiErrorSchema.parse` fails (RED). (The GET `/health` 200 + `healthResponseSchema.parse` regression test passes immediately — it is a guard, not RED.) Record RED output.
  - GREEN: add `notFound` (→ `AppError('NOT_FOUND','Route not found')`), `healthRouter` (`Router().get('/', getHealth)`) and `getHealth` (current `app.ts` L17–18 body; no service), and rewire `app.ts` order: helmet, cors, `express.json()`, cookieParser, `app.use('/health', healthRouter)`, `notFound`, `errorHandler`. Path and response unchanged.
  - **Verify**: `pn --filter @launchly/api test -- src/app.test.ts` + `pn typecheck`. Commit as `feat(api): SCRUM-33 add JSON 404 and health reference module`.

**Checkpoint**: All error categories return the shared shape; 404 is JSON; `/health` unchanged. US1 independently testable.

---

## Phase 4: User Story 2 — Reusable request-validation boundary (Priority: P1)

**Goal**: One `validate()` middleware validates body/params/query before the controller, aggregating failures and passing typed, sanitized input on success.

**Independent Test**: Attach `validate()` to test routes and assert invalid input → 400 with part-prefixed paths, valid input reaches the controller typed and stripped of unknown keys.

- [X] T005 (issue T5, R6) `validate()` middleware in `apps/api/src/middlewares/validate.ts` with `apps/api/src/middlewares/validate.test.ts`.
  - RED: write `validate.test.ts` against a stub `validate = () => (_req,_res,next) => next()`, with its own app (`express.json()`, test routes, `errorHandler`): `body: loginSchema` with `{email:'x'}` → 400, details path `['body','email']`; valid body + extra key → handler echoes body, extra key absent; `query: z.object({ page: z.coerce.number().int().min(1) })` with `?page=abc` → 400 and with `?page=2` → handler sees `typeof page === 'number'`, value `2`; `params: z.object({ id: z.uuid() })` on `/items/:id` with `/items/not-a-uuid` → 400 path `['params','id']`. Record RED output.
  - GREEN: implement D5 — `validate({ body?, params?, query? })` runs `safeParse` on each supplied part, aggregates all failing parts' issues with part-name-prefixed paths, `next(new AppError('VALIDATION_ERROR','Invalid request', details))` on failure; on success assign `req.body`/`req.params` and set query via `Object.defineProperty(req,'query',{ value, writable:true, configurable:true, enumerable:true })`. No `asyncHandler`.
  - **Verify**: `pn --filter @launchly/api test -- src/middlewares/validate.test.ts` + `pn typecheck`. Commit as `feat(api): SCRUM-33 add validate() request-validation middleware`.

**Checkpoint**: US1 and US2 both work independently.

---

## Phase 5: User Story 3 — Reference module & documented conventions (Priority: P2)

**Goal**: Conventions are written down and consistent with the delivered code; guidance files updated. (The health reference module itself landed in T004.)

**Independent Test**: Review every symbol/path/status in the doc against the code; confirm guidance files match.

- [ ] T006 (issue T6, R8) Conventions documentation and guidance-file updates.
  - Files: `docs/Backend-Conventions.md` (new), `AGENTS.md` (edit), `README.md` (edit).
  - Write `docs/Backend-Conventions.md` (English, ~100–150 lines): module layout & naming; layering rules; REST/JSON (plural kebab-case nouns, no `/v1`, camelCase JSON, ISO-8601, UUID ids, success-body conventions); error-contract table (code → status → when); a `validate()` example with `loginSchema` and a controller reading `req.body as LoginInput`; pagination (documented only: `?page` 1-based, `?pageSize` default 20/max 100, `{items,page,pageSize,total}`); testing (colocated `*.test.ts`, supertest on `createApp()`); logging (`console.error` for 500 only until a pino ticket); security reminders; follow-ups.
  - `AGENTS.md`: replace "No tests exist yet." with "Tests are colocated `*.test.ts` (Vitest; API endpoints via supertest on `createApp()`)."; change the `middlewares/` bullet to "(error handler, validate, not-found)"; add a "Conventions and gotchas" bullet pointing to `docs/Backend-Conventions.md` and the throw-`AppError`/`validate()`/never-`res.status().json()` rule.
  - `README.md`: change the `middlewares/` line to `# error handler, validate, not-found (auth to come)`.
  - `docs/` is prettier/eslint-ignored → manually check every symbol and path against the code.
  - **Verify**: doc review against delivered symbols; `pn typecheck`/`pn lint` still green. Commit as `docs: SCRUM-33 add backend conventions`.

**Checkpoint**: All user stories independently functional and documented.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final refactor (tests stay green), full verification, and the size/dependency gates.

- [ ] T007 (issue T7, R9) Final verification and gates.
  - Refactor only while tests stay green (e.g. `it.each`) across the files above.
  - Run the full local suite: `pn typecheck && pn lint && pn test && pn format:check` and `pn --filter @launchly/api build`.
  - Run the quickstart smoke test (`grep -rn "lib/prisma" apps/api/src` matches nothing; `pn dev:api`; `curl` `/health`→200, `/nope`→404 `NOT_FOUND`, malformed POST→400; stop server).
  - Size gate: `git fetch origin main && git diff --shortstat origin/main...HEAD -- apps packages` ≤300 insertions+deletions.
  - Dependency gate: `git diff --quiet origin/main...HEAD -- pnpm-lock.yaml '**/package.json'` exits 0.
  - Reconcile this `tasks.md` with the delivered state and complete the PR description.

**Checkpoint**: Feature complete; all gates pass on the final head.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1 / T001)**: no dependencies — first.
- **Foundational (Phase 2 / T002)**: after Setup — BLOCKS US1/US2 error assertions.
- **US1 (Phase 3 / T003, T004)**: after T002.
- **US2 (Phase 4 / T005)**: after T002 (uses `AppError`); independent of US1 but ordered after it per the issue.
- **US3 (Phase 5 / T006)**: after T003–T005 so the doc matches delivered symbols.
- **Polish (Phase 6 / T007)**: after all above.

### Task Dependencies

- T001 → T002 → T003 → T004 → T005 → T006 → T007 (the issue's mandated order).
- T003 provides `AppError`, required by T004, T005, and the `notFound`/`validate` code paths.

### Parallel Opportunities

- T002 is `[P]` relative to API tasks (different package), but the issue fixes the overall T1→T7 sequence, so follow it in order for a single implementer.
- Within a task, RED tests are written before GREEN implementation.

---

## Implementation Strategy

### MVP scope

User Story 1 (T001–T004) is the MVP: the shared error contract plus safe, consistent error responses and a JSON 404 — the hard dependency for SCRUM-23. US2 (`validate()`) and US3 (docs) complete the foundation.

### Incremental delivery

1. T001 (test env) → suite boots.
2. T002 (contract) → shared shape available.
3. T003–T004 (US1) → consistent safe errors + JSON 404 + health module. **Validate, demo.**
4. T005 (US2) → validation boundary. **Validate.**
5. T006 (US3) → docs. 6. T007 → gates + PR.

---

## Notes

- `[P]` = different files, no dependencies; the issue still fixes the T1→T7 order for a single session.
- Record RED and GREEN output per task in the PR; each error test asserts `apiErrorSchema.parse(res.body)`.
- Commit after each task; every commit stays buildable and green.
- Phase 2 (implementation) begins only after a person approves the `checklists/` items; the agent never ticks them.
