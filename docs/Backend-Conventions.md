# Backend Conventions

How the Launchly API (`apps/api`) is structured and the rules every module follows. Written in English; keep it in sync with the code it describes. Companion to `docs/Frontend-Conventions.md`.

## 1. Module layout and naming

Feature code lives under `apps/api/src/modules/<feature>/`, one folder per resource:

- `<feature>.routes.ts` — an Express `Router`; wires paths to controllers and `validate()`.
- `<feature>.controller.ts` — request/response glue; reads validated input, calls a service, sends the response.
- `<feature>.service.ts` — business logic and Prisma access (added when the feature needs data).

Cross-cutting code sits outside modules: `middlewares/` (`error-handler`, `validate`, `not-found`), `lib/` (`env.ts`, `prisma.ts`, `app-error.ts`), and `providers/` (swappable storage/mail). `modules/health/` is the reference module — copy its shape for new features.

Import same-app files with the `@/` alias (`@/lib/app-error`), never `../` paths. Files are kebab-case; exported symbols are camelCase (`getHealth`, `validate`) or PascalCase for classes/types (`AppError`, `LoginInput`).

## 2. Layering rules

`route → controller → service → Prisma`. A controller never touches Prisma directly once a service exists; a service never reads `req`/`res`. Routes contain no logic beyond wiring middleware and controllers. Never expose Prisma types across the HTTP boundary — map to a shared DTO from `@launchly/shared`.

Write asynchronous code with `async/await`; use `.then()` only when you need the Promise object itself (caching or sharing an in-flight call). Run independent queries together with `Promise.all`, or in one `prisma.$transaction` when they must be atomic.

## 3. REST and JSON conventions

- Resource paths are plural, kebab-case nouns (`/job-posts`, `/applications`). No `/v1` prefix yet.
- JSON field names are camelCase. Timestamps are ISO-8601 strings; ids are UUID strings.
- Success bodies return the resource (or `{ items, page, pageSize, total }` for lists). Errors always use the shared error contract (section 4).

## 4. Error contract

Every error response is the shared `apiErrorSchema` from `@launchly/shared`:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Invalid request", "details": [] } }
```

`details` is present only for validation failures. Raise failures by throwing `AppError`; never call `res.status().json()` for errors — let the central `errorHandler` map them.

| Code | HTTP | When |
| --- | --- | --- |
| `VALIDATION_ERROR` | 400 | `validate()` failure, `ZodError`, malformed JSON |
| `UNAUTHORIZED`, `UNAUTHENTICATED`, `INVALID_SESSION`, `INVALID_CREDENTIALS`, `INVALID_GOOGLE_IDENTITY` | 401 | Missing/invalid session or credentials |
| `FORBIDDEN`, `EMAIL_NOT_VERIFIED`, `ACCOUNT_LOCKED` | 403 | Role restriction or account state |
| `NOT_FOUND` | 404 | Unknown route; missing resource |
| `CONFLICT`, `EMAIL_ALREADY_REGISTERED`, `ACCOUNT_ALREADY_REGISTERED` | 409 | Duplicate / constraint conflict |
| `PAYLOAD_TOO_LARGE` | 413 | Body exceeds the parser limit (100kb default) |
| `RATE_LIMITED` | 429 | Rate limiting |
| `INVALID_OR_EXPIRED_TOKEN` | 400 | Invalid or expired one-time auth token |
| `EMAIL_DELIVERY_FAILED`, `GOOGLE_SIGN_IN_UNAVAILABLE` | 503 | Required auth provider is unavailable |
| `INTERNAL_ERROR` | 500 | Any unexpected fault — generic body, no leak |

A 500 body is always exactly `{ "error": { "code": "INTERNAL_ERROR", "message": "Internal server error" } }`: no original message, stack, SQL, or secret ever reaches the client. The handler `console.error`s only 5xx faults; 4xx are not logged.

```ts
throw new AppError('CONFLICT', 'Email already registered');
```

## 5. Request validation

Validate body, params, and query with one `validate()` middleware, per route, before the controller:

```ts
import { validate } from '@/middlewares/validate';
import { loginSchema } from '@launchly/shared';

router.post('/login', validate({ body: loginSchema }), login);

export const login: RequestHandler = (req, res) => {
  const input = req.body as LoginInput; // parsed, typed, unknown keys stripped
  // ...
};
```

`validate()` runs `safeParse` on each supplied part, aggregates every failing part's issues with part-prefixed paths (`['body','email']`, `['params','id']`), and throws `AppError('VALIDATION_ERROR', ...)` on failure. On success it replaces `req.body`/`req.params` and redefines `req.query` (Express 5 exposes `req.query` through a getter, so a plain assignment would throw). Define request shapes as Zod schemas in `@launchly/shared` and reuse them on both sides.

## 6. Pagination (documented; not yet implemented)

List endpoints will accept `?page` (1-based, default 1) and `?pageSize` (default 20, max 100) and return `{ items, page, pageSize, total }`. Coerce and bound these with a shared query schema through `validate({ query })`.

## 7. Testing

Tests are colocated `*.test.ts` files (Vitest). Exercise endpoints with `supertest` against `createApp()`; assert error bodies with `apiErrorSchema.parse(res.body)`. The suite runs with no `.env` and no database — `vitest.config.ts` supplies test env values, and foundation routes never call Prisma. Follow red → green: write the failing assertion first, then the implementation.

```bash
pn --filter @launchly/api test
pn --filter @launchly/api test -- src/app.test.ts
```

## 8. Logging and security reminders

- Log with `console.error` for 5xx only until a dedicated logging ticket (pino) lands.
- `lib/env.ts` validates environment at import and fails fast; add new variables there with a Zod rule.
- Helmet and CORS (credentialed, single origin) are applied in `createApp()`. Keep secrets out of responses, logs, and commits.

## 9. Follow-ups

- Auth (`UNAUTHORIZED` / `FORBIDDEN`) arrives with SCRUM-23.
- Structured logging (pino) and rate limiting (`RATE_LIMITED`) are reserved codes with no implementation yet.

## Public job visibility

A job is public only when `publicationStatus = PUBLISHED` and its company is `APPROVED`. Always compose `publicJobWhere` from `modules/job/job.service.ts` (used by search and detail). Hidden or non-public jobs return `NOT_FOUND`, so existence never leaks.

Salary reaches candidates only through `toPublicSalary` (`modules/job/job-salary.ts`). When `Job.salaryHidden` is true it returns `{ negotiable: true, min: null, max: null }`; never map `salaryMin`/`salaryMax` by hand in a public response.
