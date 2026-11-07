# Error Response Contract

**Owner**: `@launchly/shared` → `packages/shared/src/schemas/error.ts` (exported from `index.ts`)

This is the single contract for every error body the API returns. Both the API and the web app import it; no module redeclares it.

## Schema (authoritative definition from SCRUM-33 D1)

```ts
import { z } from 'zod';

export const errorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'PAYLOAD_TOO_LARGE',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
]);
export type ErrorCode = z.infer<typeof errorCodeSchema>;

export const errorDetailSchema = z.object({
  path: z.array(z.union([z.string(), z.number()])),
  message: z.string(),
});
export type ErrorDetail = z.infer<typeof errorDetailSchema>;

export const apiErrorSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    details: z.array(errorDetailSchema).optional(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;
```

## Code → HTTP status

| Code                | HTTP | Trigger                                               |
| ------------------- | ---- | ----------------------------------------------------- |
| `VALIDATION_ERROR`  | 400  | `validate()` failure, `ZodError`, malformed JSON body |
| `UNAUTHORIZED`      | 401  | Reserved (auth)                                       |
| `FORBIDDEN`         | 403  | Reserved (role guard)                                 |
| `NOT_FOUND`         | 404  | Unknown route (`notFound`), missing resource          |
| `CONFLICT`          | 409  | Duplicate / constraint conflict                       |
| `PAYLOAD_TOO_LARGE` | 413  | Body exceeds parser limit (100kb default)             |
| `RATE_LIMITED`      | 429  | Reserved (rate limiting)                              |
| `INTERNAL_ERROR`    | 500  | Any unexpected fault — generic body only              |

## Example bodies

Validation error (400):

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": [{ "path": ["body", "email"], "message": "Invalid email" }]
  }
}
```

Not found (404):

```json
{ "error": { "code": "NOT_FOUND", "message": "Route not found" } }
```

Internal error (500) — **no message/stack/detail/secret leak**:

```json
{ "error": { "code": "INTERNAL_ERROR", "message": "Internal server error" } }
```

## Invariants (asserted by tests)

- Every API error response satisfies `apiErrorSchema.parse(body)`.
- An unknown `code` value is rejected by `errorCodeSchema`.
- `details` is optional and is absent on `NOT_FOUND` and `INTERNAL_ERROR` responses.
- A 500 body contains only `code` + a generic `message` — never the original error message, a stack, `details`, or a secret.
