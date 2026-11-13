# Contract: Admin company moderation and recruiter company changes

All errors use the shared `apiErrorSchema`. Schemas live in `packages/shared/src/schemas/moderation.ts` unless noted.

## Schemas

```ts
moderationRejectSchema      = { reason: string }            // trimmed, 1..1000
adminCompanyListQuerySchema = { status?: 'PENDING' | 'APPROVED' | 'REJECTED' } // default 'PENDING'
adminCompanySchema = {
  id: uuid, name, address: string | null, industry, companySize, website, logoUrl, description: string | null,
  moderationStatus: 'PENDING' | 'APPROVED' | 'REJECTED',
  moderationReason: string | null,
  ownerEmail: string,
  reviewedAt: string | null,   // ISO
  createdAt: string,           // ISO
}
companyDtoSchema (company.ts, changed): + moderationReason: string | null
```

## Endpoints (all: `authenticate` + `authorize('ADMIN')`)

| Method | Path                           | Request                             | 200 response                                  | Errors                                           |
| ------ | ------------------------------ | ----------------------------------- | --------------------------------------------- | ------------------------------------------------ |
| GET    | `/admin/companies`             | query `adminCompanyListQuerySchema` | `adminCompanySchema[]`, `createdAt` ascending | 400 bad status, 401, 403                         |
| GET    | `/admin/companies/:id`         | params `companyIdParamsSchema`      | `adminCompanySchema`                          | 400, 401, 403, 404                               |
| POST   | `/admin/companies/:id/approve` | none                                | `adminCompanySchema` (APPROVED)               | 400, 401, 403, 404, 409 already decided          |
| POST   | `/admin/companies/:id/reject`  | body `moderationRejectSchema`       | `adminCompanySchema` (REJECTED)               | 400 blank or too long reason, 401, 403, 404, 409 |

Side effect of approve / reject: one email to the owner (`createModerationEmail`), sent after the response is decided; failures are logged only.

## Changed recruiter endpoints

| Method | Path                      | Change                                                                                              |
| ------ | ------------------------- | --------------------------------------------------------------------------------------------------- |
| POST   | `/companies`              | 409 `CONFLICT` only when the caller has a `PENDING` or `APPROVED` company (was: any company)        |
| GET    | `/companies/me`           | returns the newest company and its `moderationReason`                                               |
| GET    | `/companies/:id` (public) | unchanged rule (APPROVED only); `moderationReason` is always `null` there because approve clears it |
