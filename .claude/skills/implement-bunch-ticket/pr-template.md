## Tickets

<One row per ticket delivered in this PR.>

| Key     | Title   | Jira                                                       | Delivered               |
| ------- | ------- | ---------------------------------------------------------- | ----------------------- |
| SCRUM-n | <title> | https://hcmut-team-vmaq1hvy.atlassian.net/browse/SCRUM-<n> | <one line of behaviour> |

## Plan

`specs/wave-<n>-<slug>/plan.md` (approved by <name> at `<sha>`)

## Gate evidence (head `<sha>`)

| Gate                  | Command                                       | Exit | Result                                            |
| --------------------- | --------------------------------------------- | ---- | ------------------------------------------------- |
| Typecheck             | `pnpm typecheck`                              | 0    | <key line>                                        |
| Lint                  | `pnpm lint`                                   | 0    | <key line>                                        |
| Unit tests            | `pnpm test`                                   | 0    | <N passed>                                        |
| Changed-file coverage | `pnpm test:coverage && pnpm coverage:changed` | 0    | <min lines/branches %> or not available: <reason> |
| e2e                   | `pnpm --filter @launchly/web test:e2e`        | 0    | <N passed> or n/a: <reason>                       |

## Agent review

Reviewer: fresh subagent (did not write the code) · Rounds: <k>/3 · Verdict: <APPROVED / REJECTED>

| #   | Severity | File:line    | Finding   | Disposition                               |
| --- | -------- | ------------ | --------- | ----------------------------------------- |
| 1   | <…>      | `<path>:<n>` | <finding> | <fixed in sha / justified: reason / open> |

## e2e

<Spec files and pass counts, e.g. `apps/web/e2e/scrum-53-job-detail.spec.ts`: 4/4.>

## Acceptance criteria

| Ticket  | AC  | Implemented in | Proven by             |
| ------- | --- | -------------- | --------------------- |
| SCRUM-n | AC1 | `<path>`       | `<test file>::<name>` |

## Merge note

Merge with a merge commit, not squash, so per-ticket commits reach `main`.

<On the halt path replace the line above with: "Squash-merge required: contains a checkpoint commit.">

## Rule exception

Delivered under the `implement-bunch-ticket` exception (constitution: Wave delivery).
