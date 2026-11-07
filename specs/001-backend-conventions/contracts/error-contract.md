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
  'UNAUTHENTICATED',
  'INVALID_SESSION',
  'INVALID_CREDENTIALS',
  'EMAIL_NOT_VERIFIED',
  'ACCOUNT_LOCKED',
  'EMAIL_ALREADY_REGISTERED',
  'ACCOUNT_ALREADY_REGISTERED',
  'INVALID_GOOGLE_IDENTITY',
  'GOOGLE_SIGN_IN_UNAVAILABLE',
  'INVALID_OR_EXPIRED_TOKEN',
  'EMAIL_DELIVERY_FAILED',
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
| `UNAUTHENTICATED` | 401 | No valid sign-in session |
| `INVALID_SESSION` | 401 | Refresh or access session is invalid or expired |
| `INVALID_CREDENTIALS` | 401 | Email or password is incorrect |
| `EMAIL_NOT_VERIFIED` | 403 | Account email must be verified before sign-in |
| `ACCOUNT_LOCKED` | 403 | Account is locked |
| `EMAIL_ALREADY_REGISTERED` | 409 | Registration email is already in use |
| `ACCOUNT_ALREADY_REGISTERED` | 409 | Google identity is already linked to another account |
| `INVALID_GOOGLE_IDENTITY` | 401 | Google identity could not be verified |
| `GOOGLE_SIGN_IN_UNAVAILABLE` | 503 | Google sign-in is not configured |
| `INVALID_OR_EXPIRED_TOKEN` | 400 | One-time auth token is invalid or expired |
| `EMAIL_DELIVERY_FAILED` | 503 | Required auth email could not be delivered |
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
