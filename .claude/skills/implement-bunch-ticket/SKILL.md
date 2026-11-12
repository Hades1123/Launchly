---
name: implement-bunch-ticket
description: Use when a person asks to implement a whole wave of Jira SCRUM tickets from a wave-plan markdown (e.g. `docs/plans/mvp-wave-plan.md "Wave 1"`). Analyses all tickets of the wave together, asks one round of clarifications, writes one minimal Spec Kit plan with test cases, waits for the user's approval, moves the tickets in Jira (active sprint, balanced random assignees, In Progress, exception comment), implements them with TDD on one branch, runs the gates, Playwright e2e and an independent agent review, then pushes one PR and moves the tickets to In Review. Trigger on "implement wave 1", "run the next wave", "implement-bunch-ticket". Do not use for a single ticket (implement-ticket), for scoping (create-implementation-item), or to review someone else's PR (review-implementation).
---

# Implement Bunch Ticket

## Overview

Delivers **one wave** of a wave plan per run: one analysis, one round of questions, one approved plan, one branch, one agent-reviewed PR. It exists because the 30-hour MVP cannot afford the full single-ticket flow per ticket.

Core principle: **nothing is written (Jira, branch, code) before the user approves the wave plan.** After that approval the run goes straight to the PR, stopping only on the conditions below.

It runs under the constitution's **Wave delivery** exception: one branch and PR for several keys, a minimal plan instead of the full Spec Kit chain, agent Jira moves, and a fresh-agent review instead of `review-implementation`. Everything else in the constitution still applies.

Read first: `AGENTS.md`, `.specify/memory/constitution.md` (Principle IV, Wave delivery), `.claude/skills/implement-ticket/SKILL.md` (gate commands, code-review checklists, e2e conventions), `docs/Backend-Conventions.md`, `docs/Frontend-Conventions.md`.

Files in this directory:

| File                     | Use                                                                      |
| ------------------------ | ------------------------------------------------------------------------ |
| `scripts/parse-wave.mjs` | `node <dir>/scripts/parse-wave.mjs <plan.md> "<Wave n>"` → tickets JSON  |
| `scripts/assign.mjs`     | `node <dir>/scripts/assign.mjs '<keys>' '<people>'` → balanced assignees |
| `wave-plan-template.md`  | shape of `specs/wave-<n>-<slug>/plan.md`                                 |
| `pr-template.md`         | shape of the PR body                                                     |

Jira: cloud ID `bec02efe-55db-40ac-a5fc-4b23fd1c1674`, project `SCRUM`, sprint field `customfield_10020`.

Create one todo per step below. On any stop: say the step, the exact error, and the fix, and wait.

## Step 1. Load and check readiness

1. `git status --porcelain --untracked-files=no` must be empty. Otherwise stop: list the files and ask the user to commit or stash them. Never stash or discard yourself.
2. `git fetch -q origin`.
3. Run `parse-wave.mjs` with the user's file and wave. Error → show it and stop. `number` 0 → stop: "Wave 0 is in-flight work; deliver it with implement-ticket."
4. `getJiraIssue` for every key: description (user story, scope, acceptance criteria, dependencies), labels, status, current assignee and sprint. A ticket already Done → drop it from the run and say so. A ticket not in To Do, or already assigned, is flagged for Step 5.
5. Dependencies: for every key in `dependsOn` (and any `## Dependencies` key in the ticket text), merged means `git log origin/main --oneline | grep -qw "<KEY>"` (whole key, so `SCRUM-4` never matches `SCRUM-41`), or its Jira status category is Done. Unmet ones: list them per ticket and ask whether to run the rest of the wave without those tickets or stop.

## Step 2. Analyse the wave together

Read code from `origin/main`. Per ticket: what exists, what changes, which areas (`api`, `web`, `shared`, `db`), gaps between the AC and the code. Across tickets:

- files touched by more than one ticket;
- several tickets changing `apps/api/prisma/schema.prisma` → **one** combined migration;
- build order: tooling tickets (label `maintenance`, e.g. Playwright setup) first, then shared schemas, then API, then web.

## Step 3. Clarify once

Send **one** message with every open question, grouped by ticket, each with your recommended default. A question the code or docs already answer is not asked: state the answer and its source. If nothing is open, say "Nothing to clarify" and continue. Wait for answers; unanswered questions take the recommended default and are marked "(default)".

## Step 4. Write the wave plan

Create `specs/wave-<n>-<slug>/plan.md` from `wave-plan-template.md` (slug = wave title, lowercase, hyphenated). Every AC of every ticket maps to at least one test case; web-facing ACs get an e2e case. Record all clarifications.

## Step 5. ⛔ Approval gate

Before asking, prepare the Jira writes so the user approves them together with the plan:

1. **Team pool:** `searchJiraIssuesUsingJql` `project = SCRUM` with fields `assignee,reporter` (page through all); distinct active accountIds with display names.
2. **Assignees:** `assign.mjs` with the wave's keys and the pool. Fill the plan's Assignee column.
3. **Sprint:** `searchJiraIssuesUsingJql` `project = SCRUM AND sprint in openSprints()` with field `customfield_10020`; take the entry with `state: "active"` (id and name). None → ask which sprint.

A ticket that already has an assignee keeps it (run `assign.mjs` only for unassigned tickets) unless the user says otherwise. Show: plan path, the ticket table with **current → new** status, assignee and sprint per ticket (flagged tickets from Step 1 marked ⚠ with their current state, since someone may already be working on them), and the writes that follow (sprint, assignee, In Progress, comment for each ticket). The user may also add or remove people from the pool here. Ask for approval. Changes → revise and show again. Only an explicit yes from the user counts. Then fill the plan's `Plan approved by` line.

## Step 6. Jira moves (before any code)

For each ticket, without further previews (covered by Step 5):

1. `editJiraIssue` fields `{ "customfield_10020": <sprintId>, "assignee": { "accountId": "<id>" } }` (omit `assignee` for a ticket that keeps its existing assignee).
2. `getTransitionsForJiraIssue`, then `transitionJiraIssue` with the transition whose target status is **In Progress**.
3. `addCommentToJiraIssue`: "Delivered under the implement-bunch-ticket rule exception (constitution: Wave delivery — one branch/PR for the wave, minimal plan, agent Jira moves, agent review). Wave <n>: <title>. Plan: `specs/wave-<n>-<slug>/plan.md` on branch `feat/wave-<n>-<slug>`."
4. Read back status, sprint and assignee. Print the ticket → assignee → status table.

## Step 7. Implement

1. `git switch -c feat/wave-<n>-<slug> origin/main`. Commit the plan: `docs: wave <n> plan`.
2. Ticket by ticket in plan order, under `superpowers:test-driven-development`:
   - write the plan's tests for the ticket, run them, see them fail for the expected reason;
   - write the code; run them green; run `pnpm test` for regressions;
   - commit with the ticket's key: `<type>(<scope>): SCRUM-<n> <summary>` (scopes `api`, `web`, `shared`, `db`, `deps`).
3. e2e specs: `apps/web/e2e/scrum-<n>-<slug>.spec.ts`, one `test()` per web-facing AC titled `AC<k>: …`, locators by role/label/text, no `waitForTimeout` (same rules as implement-ticket Phase 5).
4. A change needed in a ticket outside the wave → stop and ask.

## Step 8. Gates, e2e, agent review

Round counter starts at 1.

1. **Gates** (repo root): `pnpm typecheck`, `pnpm lint`, `pnpm test`. For `feature` tickets also `pnpm test:coverage && pnpm coverage:changed` if both scripts exist in the root `package.json`; otherwise record `not available: <missing script>`, never `pass`.
2. **e2e** when the diff touches `apps/web`. If `apps/web/package.json` has no `test:e2e` script (the wave did not include or build the Playwright setup ticket first), **stop**: a missing e2e command blocks, it is never skipped (constitution, Local gates). Otherwise `pnpm db:up`, `pnpm db:migrate`, `pnpm db:seed`, then `pnpm --filter @launchly/web test:e2e`. Docker not running → stop and report.
3. **Agent review:** dispatch a fresh `general-purpose` subagent (never review your own diff) with: `git diff origin/main...HEAD`, the plan path, the Jira keys and their AC, and these checklists — `code-review` skill at high effort; for `apps/web` `vercel-react-best-practices` and `docs/Frontend-Conventions.md`; for `apps/api` `docs/Backend-Conventions.md`; for `packages/shared` constitution Principle I. It returns a findings table (`# | Severity | File:line | Finding`) and a verdict `APPROVED`/`REJECTED`, plus per ticket whether every AC is proven by a passing test.
4. **Decide:** any failing gate, failing e2e, unproven AC, or Critical/Important finding → back to Step 7 with that list, round + 1. A 4th round would start → **halt**: commit `chore(<scope>): SCRUM-<n> checkpoint before halt` if the tree has unbuildable work, push, open the PR as **Draft** (merge note: squash required), leave tickets In Progress, report what failed in each round.

## Step 9. Ship

1. `git push -u origin feat/wave-<n>-<slug>`.
2. Fill `pr-template.md`; `gh pr create --base main --title "[SCRUM-a, SCRUM-b, …] Wave <n>: <outcome>" --body-file <file>`.
3. Transition every ticket to **In Review** (same lookup as Step 6). Read back.

## Step 10. Report and stop

PR URL, gate table for the head SHA, review rounds and verdict, ticket → assignee → status table, and: "A person merges (merge commit, not squash) and moves the tickets to Done." Never merge, never push to `main`, never move a ticket to Done.

## Red Flags: STOP

| Thought                                                  | Reality                                                       |
| -------------------------------------------------------- | ------------------------------------------------------------- |
| "I'll start coding while the user reads the plan"        | Nothing (Jira, branch, code) before the Step 5 yes.           |
| "The user said go earlier, so the plan is approved"      | Approval is for the plan and Jira writes on screen in Step 5. |
| "This ticket's AC is covered by another ticket's tests"  | Every AC maps to a passing test listed in the plan.           |
| "The coverage script is missing, so the gate passed"     | Record `not available`, never `pass`.                         |
| "I'll just assign everything to the user"                | Use `assign.mjs` over the team pool.                          |
| "I can review my own diff, it's faster"                  | Fresh subagent only.                                          |
| "One more fix round and it'll pass"                      | Three rounds, then Draft PR and halt.                         |
| "A ticket outside the wave needs a small change too"     | Stop and ask.                                                 |
| "Wave 0 is small, I'll do it here"                       | Refuse; Wave 0 uses implement-ticket.                         |
| "Everything is green, I'll merge / move tickets to Done" | People merge and move tickets to Done.                        |
