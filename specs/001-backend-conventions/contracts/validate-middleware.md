# Validation Middleware Contract

**Owner**: `apps/api/src/middlewares/validate.ts` (uses `AppError` from `apps/api/src/lib/app-error.ts`)

A single reusable request-validation boundary applied per route, before the controller runs. Enforces constitution Principle I (validate body/params/query against shared schemas before the service).

## Signature (from SCRUM-33 D5)

```ts
validate(schemas: {
  body?: z.ZodType;
  params?: z.ZodType;
  query?: z.ZodType;
}): RequestHandler
```

Usage (per route, not global):

```ts
router.post('/login', validate({ body: loginSchema }), login);
// controller then reads req.body as the parsed, typed LoginInput
```

## Behaviour

| Condition                         | Result                                                                                                                                                                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A supplied part fails `safeParse` | Collect issues from **all** failing parts, each path prefixed with the part name (`body` / `params` / `query`), then `next(new AppError('VALIDATION_ERROR', 'Invalid request', details))` → 400 in `apiErrorSchema` shape |
| All supplied parts pass           | Assign parsed values: `req.body = parsed`, `req.params = parsed`; for query use `Object.defineProperty(req, 'query', { value: parsed, writable: true, configurable: true, enumerable: true })`                            |
| Valid body with extra keys        | Unknown keys stripped (`z.object` default); controller never sees them                                                                                                                                                    |
| No schema supplied for a part     | That part is left untouched                                                                                                                                                                                               |

## Invariants (asserted by tests)

- Invalid `body` → 400 with a detail path beginning `['body', ...]`.
- Invalid `params` (e.g. non-UUID `id`) → 400 with path `['params','id']`.
- `query` coerced/typed: after `validate({ query })`, the controller sees correctly typed values (e.g. `typeof page === 'number'`).
- A valid request reaches the controller with the parsed body and no unknown keys.
- Multiple failing parts are reported together.

## Design notes

- No `asyncHandler` wrapper: Router 2.x forwards rejected promises to `next(err)`.
- `Object.defineProperty` is required for `query` because Express 5 exposes `req.query` via a getter.
