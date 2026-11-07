# Quickstart

1. `pnpm --filter @launchly/shared test` and `pnpm --filter @launchly/api test -- src/modules/jobs` pass.
2. Optional, with a migrated local DB (`pn db:up && pn db:migrate`): `pn dev:api`, then `curl localhost:4000/jobs/<seeded published job id>` returns salary; set that job's `salaryHidden = true` and repeat: `salary` is `{"negotiable":true,"min":null,"max":null}`.
3. Draft/pending job id and a random UUID return the same 404 body; `/jobs/abc` returns 400.
