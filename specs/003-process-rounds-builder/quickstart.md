# Quickstart: Validate the Rounds Builder

## Prerequisites

`pn db:up`, `apps/api/.env` and `apps/web/.env` copied from their examples, `pn db:migrate`, `pn --filter @launchly/api exec prisma generate`.

## Automated

```bash
pn typecheck && pn lint && pn test
# DB-backed checks need a disposable, migrated database; never run them against shared data:
DATABASE_URL=postgresql://launchly:launchly@localhost:5433/<scratch_db> pn --filter @launchly/api exec prisma migrate deploy
RUN_DB_TESTS=1 pn --filter @launchly/api test -- job-rounds.integration.test.ts
```

Expected: all pass; the integration test covers reorder, delete, the in-use guard and 8 concurrent saves.

## Manual (browser)

1. Sign in as the recruiter who owns a job; open `/recruiter/jobs/<jobId>/rounds`.
2. Empty job: the empty-state message shows. Add two rounds and press save with blank fields: every invalid field is flagged and nothing is stored.
3. Fill both rounds and save; reload: same rounds, same order.
4. Move round 2 up, save, reload: order swapped, numbers 1 and 2.
5. Delete a round, save, reload: one round remains.
6. As a candidate or another recruiter: the API returns 403.

See [contracts/rounds.contract.md](contracts/rounds.contract.md) and [data-model.md](data-model.md).
