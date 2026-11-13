# Contract: Admin job moderation

Errors use `apiErrorSchema`. Schemas in `packages/shared/src/schemas/moderation.ts`.

```ts
adminJobListQuerySchema = { status?: 'PENDING' | 'PUBLISHED' | 'REJECTED' } // default 'PENDING'
adminJobSchema = recruiterJobSchema.extend({
  companyName: string,
  creatorEmail: string,
  reviewedAt: string | null, // ISO
})
// reject body: moderationRejectSchema (SCRUM-71)
```

| Method | Path                      | Request                       | 200                                                              | Errors                  |
| ------ | ------------------------- | ----------------------------- | ---------------------------------------------------------------- | ----------------------- |
| GET    | `/admin/jobs`             | query                         | `adminJobSchema[]`, `updatedAt` ascending                        | 400, 401, 403           |
| GET    | `/admin/jobs/:id`         | params `jobIdParamsSchema`    | `adminJobSchema`                                                 | 400, 401, 403, 404      |
| POST   | `/admin/jobs/:id/approve` | none                          | `adminJobSchema` (`status: PUBLISHED`, `moderationReason: null`) | 401, 403, 404, 409      |
| POST   | `/admin/jobs/:id/reject`  | body `moderationRejectSchema` | `adminJobSchema` (`status: REJECTED`)                            | 400, 401, 403, 404, 409 |

Side effect: one email to the creator per successful decision; none on 409.

Changed: `PUT /recruiter/jobs/:id` with `SUBMIT` on a rejected job keeps `moderationReason`.
