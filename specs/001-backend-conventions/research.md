# Phase 0 Research: Backend Conventions and API Foundation

All technical unknowns were resolved up front in the SCRUM-33 issue (confirmed decisions D1–D10) and verified against the installed library versions. There are no open `NEEDS CLARIFICATION` items. This document records the decisions that shape the design.

## D-1: Error contract location and shape

- **Decision**: Add `packages/shared/src/schemas/error.ts` exporting `errorCodeSchema` (8-value enum), `errorDetailSchema` (`{ path: (string|number)[], message: string }`), and `apiErrorSchema` (`{ error: { code, message, details? } }`), re-exported from `index.ts`.
- **Rationale**: Constitution Principle I — every boundary shape is one shared Zod schema with `z.infer` types, reused by the API now and the web app later.
- **Alternatives considered**: Defining the error type in the API only (rejected: violates Principle I, blocks web reuse); a looser `z.record` body (rejected: not verifiable, defeats "single contract").

## D-2: Response-shape change is non-breaking

- **Decision**: The previous ad-hoc bodies (`{ error: 'VALIDATION_ERROR', issues }`, `{ error: 'INTERNAL_ERROR' }`, Express HTML 404) are replaced by `apiErrorSchema`. Not flagged `!`/BREAKING, because those bodies were never a shared schema and have no consumer (web reads only `/health`).
- **Rationale**: Principle I's breaking-change rule applies to shared schemas. The PR still calls out the observable change (D2 callout) for reviewers.
- **Alternatives considered**: Marking it BREAKING (rejected: no shared-schema contract existed to break).

## D-3: Typed application error and status map

- **Decision**: `apps/api/src/lib/app-error.ts` holds `errorStatus: Record<ErrorCode, number>` (VALIDATION_ERROR 400, UNAUTHORIZED 401, FORBIDDEN 403, NOT_FOUND 404, CONFLICT 409, PAYLOAD_TOO_LARGE 413, RATE_LIMITED 429, INTERNAL_ERROR 500), an `AppError extends Error` (readonly `code`, `status`, optional `details`, `name='AppError'`), and `zodIssuesToDetails(issues, prefix=[])` that stringifies symbol path keys.
- **Rationale**: One primitive for raising typed errors keeps the handler and services uniform; the status map is the single source for code→status. Symbol path keys exist in zod 4 (`PropertyKey[]`), so they must be normalized to keep details JSON-safe.
- **Alternatives considered**: Factory helpers per code (rejected: YAGNI, Principle VI); throwing plain objects (rejected: loses type/status).

## D-4: Central error handler ordering and no-leak rule

- **Decision**: `error-handler.ts` checks, in order: (1) `res.headersSent` → `next(err)`; (2) `AppError` with 4xx code → its status + body; (3) `ZodError` → 400 VALIDATION_ERROR, `Invalid request`, details from helper; (4) `err.type === 'entity.parse.failed'` → 400 `Malformed JSON body`; (5) `err.type === 'entity.too.large'` → 413 `Request body too large`; (6) everything else (incl. `AppError('INTERNAL_ERROR')` and non-Error throws) → `console.error(err)` + generic 500. 4xx are not logged; bodies are built only from the contract.
- **Rationale**: Principle III — one error format, no stack/SQL/secret leak. body-parser emits `entity.parse.failed` (default 100kb) and `entity.too.large` (413) with those `type` values (verified in installed `body-parser`/`raw-body`).
- **Alternatives considered**: Spreading `err` into the body (rejected: leaks internals); logging 4xx (rejected: noise, and risks logging secret-bearing validation input).

## D-5: `validate()` middleware semantics

- **Decision**: `validate({ body?, params?, query? })` runs `safeParse` on each supplied part, aggregates all failing parts' issues with part-name-prefixed paths, and on failure calls `next(new AppError('VALIDATION_ERROR', 'Invalid request', details))`. On success it assigns `req.body`/`req.params` and, for query, uses `Object.defineProperty(req, 'query', { value, writable, configurable, enumerable })`.
- **Rationale**: Express 5 defines `req.query` via a getter (`defineGetter` in installed `express/lib/request.js`), so plain assignment throws; `defineProperty` is required. Router 2.x forwards rejected promises to `next(err)`, so no `asyncHandler` wrapper is needed (Principle VI).
- **Alternatives considered**: Reassigning `req.query = parsed` (rejected: getter-only, throws); a global `app.use` validate (rejected: route params don't exist at app level).

## D-6 / D-7: Not-found handler and reference module

- **Decision**: `not-found.ts` → `notFound` calls `next(new AppError('NOT_FOUND', 'Route not found'))`. `/health` becomes `modules/health/health.routes.ts` (`healthRouter`) + `health.controller.ts` (`getHealth`, current body, no service). `app.ts` order: helmet, cors, json, cookieParser, `app.use('/health', healthRouter)`, `notFound`, `errorHandler`. Path and response unchanged.
- **Rationale**: Principle II layering; health has no logic/data so it needs no service. A JSON 404 (Principle III consistent format) replaces Express's HTML default.
- **Alternatives considered**: Keeping the inline `/health` route (rejected: no reference pattern for later modules).

## D-9: Test environment without `.env` or database

- **Decision**: Add a `test.env` block to `apps/api/vitest.config.ts` providing `NODE_ENV`, a placeholder `DATABASE_URL`, and ≥32-char `JWT_SECRET`/`JWT_REFRESH_SECRET`, so `lib/env.ts`'s import-time `parse` succeeds; tests never connect to Postgres.
- **Rationale**: `env.ts` validates at import and requires those vars; the foundation routes never call Prisma, so no DB is needed. Verified: `app.ts` imports `env` but not `prisma`.
- **Alternatives considered**: A committed `.env` for tests (rejected: `.env` is never committed, Principle V); mocking `env` (rejected: more complex than supplying test env values).

## D-10: No new dependencies; logging posture

- **Decision**: No new runtime/dev dependency. `console.error` for 500s only. Do not edit the setup plan or constitution in this ticket (their staleness is tracked as follow-ups).
- **Rationale**: Principle VI (simplicity, pinned deps). pino and rate limiting are explicitly "later" per the setup plan; adding them now would be speculative.
- **Alternatives considered**: Adding pino/express-rate-limit now (rejected: out of scope, reserved `RATE_LIMITED` code documents the future need).

## Verified library facts (from installed versions)

- Express 5.3.0 `req.query` is a getter → must use `Object.defineProperty`.
- Router 2.x forwards rejected promises to `next(err)` → no async wrapper needed.
- body-parser: malformed JSON → `type: 'entity.parse.failed'`; default limit 100kb; oversize → `type: 'entity.too.large'` (413).
- zod 4 issue `path` is `PropertyKey[]` (may contain symbols) → stringify in the mapping helper.
