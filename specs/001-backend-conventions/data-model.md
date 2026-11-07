# Phase 1 Data Model: Backend Conventions and API Foundation

This feature introduces no persisted entities (no Prisma models, no migrations). The "data model" here is the set of in-memory contract types that cross the API boundary or are raised internally.

## ApiError (shared contract — `packages/shared/src/schemas/error.ts`)

The canonical error response body. Single source of truth; no module may redeclare it.

| Field           | Type                       | Rules                                                                         |
| --------------- | -------------------------- | ----------------------------------------------------------------------------- |
| `error.code`    | `ErrorCode` enum           | One of the 8 codes; unknown values rejected by the schema                     |
| `error.message` | string                     | Human-readable; for 500 it is a fixed generic string                          |
| `error.details` | `ErrorDetail[]` (optional) | Present for validation failures; omitted otherwise and always omitted for 500 |

**ErrorCode enum → HTTP status** (`errorStatus` map in `apps/api/src/lib/app-error.ts`):

| Code                | Status | When used                                   |
| ------------------- | ------ | ------------------------------------------- |
| `VALIDATION_ERROR`  | 400    | Schema violation, malformed JSON body       |
| `UNAUTHORIZED`      | 401    | Reserved for auth (SCRUM-23)                |
| `FORBIDDEN`         | 403    | Reserved for role guards (SCRUM-23)         |
| `NOT_FOUND`         | 404    | Unknown route; missing resource             |
| `CONFLICT`          | 409    | Duplicate/constraint (e.g. duplicate email) |
| `PAYLOAD_TOO_LARGE` | 413    | Request body exceeds the parser limit       |
| `RATE_LIMITED`      | 429    | Reserved for rate limiting (follow-up)      |
| `INTERNAL_ERROR`    | 500    | Any unexpected fault; generic body, no leak |

## ErrorDetail (shared contract)

One field-level problem within an error.

| Field     | Type                   | Rules                                                                                                                    |
| --------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `path`    | `(string \| number)[]` | Location of the offending field, including its request part (e.g. `['body','email']`). Symbol keys normalized to strings |
| `message` | string                 | Field-level message from the failing schema                                                                              |

## AppError (internal — `apps/api/src/lib/app-error.ts`)

The single way business/middleware code signals a failure. Not serialized directly; the handler maps it to `ApiError`.

| Member    | Type                                 | Rules                                    |
| --------- | ------------------------------------ | ---------------------------------------- |
| `code`    | `ErrorCode` (readonly)               | Drives status via `errorStatus`          |
| `status`  | number (readonly)                    | Derived from `errorStatus[code]`         |
| `message` | string                               | Not sent to clients for `INTERNAL_ERROR` |
| `details` | `ErrorDetail[]` (optional, readonly) | Only surfaced for 4xx                    |
| `name`    | `'AppError'`                         | —                                        |

**Helper**: `zodIssuesToDetails(issues, prefix = [])` → `ErrorDetail[]`, prefixing each issue path with `prefix` and stringifying symbol keys.

## Validation Target (internal — input to `validate()`)

Describes what a route validates. Not persisted; constructed per route.

| Field    | Type                   | Rules                                                                          |
| -------- | ---------------------- | ------------------------------------------------------------------------------ |
| `body`   | `z.ZodType` (optional) | Parsed; result replaces `req.body`; unknown keys stripped (`z.object` default) |
| `params` | `z.ZodType` (optional) | Parsed; result replaces `req.params`                                           |
| `query`  | `z.ZodType` (optional) | Parsed; result assigned via `Object.defineProperty` (Express 5 getter)         |

**Failure semantics**: all supplied parts are parsed; issues from every failing part are aggregated with part-name-prefixed paths; `next(new AppError('VALIDATION_ERROR', 'Invalid request', details))`.

## Reused existing contracts (no change)

- `healthResponseSchema` (`packages/shared/src/schemas/common.ts`) — the `/health` response still validates against it; path and body unchanged.
- `loginSchema` (`packages/shared/src/schemas/auth.ts`) — used only as a fixture in validation/error tests; no change.

## State transitions

None. All types are stateless request/response shapes or per-request middleware inputs.
