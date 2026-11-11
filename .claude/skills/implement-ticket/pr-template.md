Jira: https://hcmut-team-vmaq1hvy.atlassian.net/browse/SCRUM-<n>

## Summary

<2-4 sentences: what changes for whom, from the Story.>

- **Delivery label:** `<feature | bug | maintenance>`
- **Spec Kit:** `specs/<NNN-slug>/` | not applicable (<reason>)
- **Pre-review:** <link to the `implement-ticket:code-review` comment>, round <k>

## Gate evidence (head `<sha>`)

| Gate                  | Command                                       | Exit | Result                                          |
| --------------------- | --------------------------------------------- | ---- | ----------------------------------------------- |
| Typecheck             | `pnpm typecheck`                              | 0    | <key line>                                      |
| Lint                  | `pnpm lint`                                   | 0    | <key line>                                      |
| Unit tests            | `pnpm test`                                   | 0    | <N passed>                                      |
| Changed-file coverage | `pnpm test:coverage && pnpm coverage:changed` | 0    | <min lines % / min branches %> or n/a (<label>) |
| e2e                   | `pnpm --filter @launchly/web test:e2e`        | 0    | <N passed> or n/a (<reason>)                    |

## RED → GREEN evidence

| Test                  | RED (before)   | GREEN (after) |
| --------------------- | -------------- | ------------- |
| `<file>::<test name>` | <failure line> | pass          |

## Acceptance criteria

| AC / T-id / E-id | Implemented in | Proven by                                                            |
| ---------------- | -------------- | -------------------------------------------------------------------- |
| AC1              | `<path>`       | `<test file>::<name>` / `apps/web/e2e/scrum-<n>-<slug>.spec.ts::AC1` |

## Out of scope / follow-ups

<or "None">
