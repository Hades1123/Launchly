# Quickstart: Validate Backend Conventions and API Foundation

This guide proves the feature works end-to-end. It assumes a cloned repo on branch `feat/SCRUM-33-backend-conventions`. See [contracts/](./contracts/) and [data-model.md](./data-model.md) for the shapes referenced below.

## Prerequisites

- Node + pnpm (`pn` alias) per repo setup.
- No database required for this feature's tests or smoke test. A fresh clone needs the Prisma client generated once so `pn typecheck` resolves imports:

```bash
cp -n apps/api/.env.example apps/api/.env   # fresh clone only; never commit
pn install --frozen-lockfile
pn --filter @launchly/api db:generate
```

## Automated validation (the full local gate — there is no CI)

```bash
pn typecheck
pn lint
pn test
pn format:check
pn --filter @launchly/api build
```

Expected: all pass. The API test suite runs with **no `apps/api/.env`** and **no database** because `vitest.config.ts` injects test env values (D9).

Targeted test files:

```bash
pn --filter @launchly/shared test                                   # error contract (T2)
pn --filter @launchly/api test -- src/middlewares/error-handler.test.ts  # T3
pn --filter @launchly/api test -- src/middlewares/validate.test.ts       # T5
pn --filter @launchly/api test -- src/app.test.ts                        # 404 / malformed / oversized / health (T3,T4)
```

## What the tests prove (maps to spec requirements)

| Scenario                                                           | Expected                                                  | Spec           |
| ------------------------------------------------------------------ | --------------------------------------------------------- | -------------- |
| Valid error body parses; unknown code rejected; `details` optional | contract holds                                            | FR-001, FR-002 |
| `AppError('CONFLICT')`                                             | 409, body `{error:{code:'CONFLICT',message}}`             | FR-003, FR-004 |
| `ZodError` in a route                                              | 400 `VALIDATION_ERROR`, detail path present               | FR-004, FR-007 |
| Thrown `Error('db password=secret')`                               | 500 generic body; response contains no `secret`, no stack | FR-005, SC-002 |
| Malformed JSON body                                                | 400 `VALIDATION_ERROR`                                    | FR-004         |
| Body > 100kb                                                       | 413 `PAYLOAD_TOO_LARGE`                                   | FR-004         |
| GET unknown route                                                  | 404 `NOT_FOUND` (JSON, not HTML)                          | FR-006         |
| GET `/health`                                                      | 200; `healthResponseSchema.parse` succeeds; unchanged     | FR-008         |
| `validate()` body/params/query cases                               | 400 with part-prefixed paths; typed success               | FR-007         |
| Every error response                                               | `apiErrorSchema.parse(res.body)` succeeds                 | SC-001         |

## Manual smoke test (no database)

First confirm no foundation code imports Prisma:

```bash
grep -rn "lib/prisma" apps/api/src   # must match nothing
```

Then:

```bash
pn dev:api            # start the API on :4000 (background)
curl -i localhost:4000/health        # → 200 JSON health body
curl -i localhost:4000/nope          # → 404 with "code":"NOT_FOUND"
curl -i -X POST -H 'Content-Type: application/json' -d '{bad' localhost:4000/health  # → 400
# stop the server
```

## Size and dependency gates (final revision)

```bash
git fetch origin main
git diff --shortstat origin/main...HEAD -- apps packages          # ≤300 insertions+deletions
git diff --quiet origin/main...HEAD -- pnpm-lock.yaml '**/package.json' && echo "no dep changes"
```

## Not applicable (with reason)

- No CI and no Docker image build in the repo (`docker-compose.yml` only runs Postgres).
- No hot path → no benchmark.
- No logger/metrics stack exists → none is added here (`console.error` for 500s only).
