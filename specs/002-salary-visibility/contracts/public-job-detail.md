# Contract: GET /jobs/:id (browser: /api/jobs/:id)

Auth: none.

- **200** `publicJobDetailSchema` body; salary per `publicSalarySchema`. Never contains `salaryMin`, `salaryMax`, `salaryHidden`, `publicationStatus`, `moderationReason`, `createdById`.
- **400** `VALIDATION_ERROR`, detail path `['params','id']` when `id` is not a UUID. No query is made.
- **404** `NOT_FOUND` "Job not found" for unknown id, non-PUBLISHED job, or non-APPROVED company (identical body).
