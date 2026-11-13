# Quickstart: validate admin job moderation

```bash
pn db:up && pn db:migrate && pn db:seed   # seed has one PENDING job
pnpm typecheck && pnpm lint && pnpm test
RUN_DB_TESTS=1 pnpm --filter @launchly/api test -- src/modules/admin/admin-job.integration.test.ts
```

Manual (admin token, API on :4000):

1. `GET /admin/jobs` → the seeded pending job with `companyName`, `rounds`, `notes`.
2. `POST /admin/jobs/<id>/reject` `{"reason":"Not entry level"}` → 200 `REJECTED`; creator email received.
3. As the recruiter, resubmit the job (`PUT /recruiter/jobs/<id>` with `action: "SUBMIT"`) → `PENDING`, `moderationReason` still "Not entry level".
4. `POST /admin/jobs/<id>/approve` → 200 `PUBLISHED`, reason null; `GET /jobs/<id>` without a token → 200.
5. Approve again → 409, no email. As a recruiter, `GET /admin/jobs` → 403.

See [contracts/admin-jobs.md](./contracts/admin-jobs.md).
