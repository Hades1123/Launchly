---
name: implement-ticket
description: Use when a person hands a Jira SCRUM Story to an agent to deliver it end to end. Verifies the ticket against the code, runs Spec Kit on a Jira-keyed branch, implements with TDD and the unit/coverage gates, opens a Draft PR, runs the automated code review and Playwright e2e, marks the PR ready, and assigns the reviewer on GitHub and Jira. Resumable. Trigger on "implement SCRUM-123", "deliver this ticket", "pick up SCRUM-123". Do not use to scope tickets (create-implementation-item) or to review someone's PR (review-implementation).
---

# Implement Ticket

## Overview

Stage 2 of the workflow in `AGENTS.md`. Input: one Jira `Story` key or URL (made by `create-implementation-item`). Output: a PR that is ready for review with every gate green on its head commit, and a reviewer assigned on GitHub and in Jira. The reviewer then runs `review-implementation`.

Core principle: **every gate runs and is recorded, or the run stops.** A gate whose command is missing, failing, or unclear blocks the run; it is never skipped, guessed or marked passed. Human gates (ticket edits, plan approval, checklist ticks, reviewer choice) wait for a person.

**Violating the letter of these phases is violating the spirit.**

Read first: `AGENTS.md`, `.specify/memory/constitution.md` (Principle IV and "Development Workflow and Quality Gates"), `.claude/create-implementation-item.md` (people, tests), `CONTRIBUTING.md`.

## Gates by delivery label

| Label         | Spec Kit (Phase 3)                                                                       | Unit gate (Phase 4)                                                      | Code review (Phase 5) | e2e (Phase 5)                        |
| ------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------- | ------------------------------------ |
| `feature`     | yes                                                                                      | typecheck, lint, test, `pn test:coverage && pn coverage:changed` (≥80 %) | yes                   | yes when the diff touches `apps/web` |
| `bug`         | yes, unless the Story cites the Maintenance exemption (fix restores specified behaviour) | typecheck, lint, test, plus a test that fails without the fix            | yes                   | yes when the diff touches `apps/web` |
| `maintenance` | no (Story must cite the Maintenance exemption)                                           | typecheck, lint, test                                                    | yes                   | yes when the diff touches `apps/web` |

Commands (run from the repo root; `pn` is an interactive alias, so scripts use `pnpm`):

- `pnpm typecheck`, `pnpm lint`, `pnpm test`
- `pnpm test:coverage && pnpm coverage:changed`
- `pnpm --filter @launchly/web test:e2e`

**Missing command:** if the root `package.json` does not define both `test:coverage` and `coverage:changed`, or `apps/web/package.json` does not define `test:e2e`, and the label needs that gate, stop at it. Tell the user the gate needs the prerequisite ticket listed in `AGENTS.md` ("Prerequisite tooling") and that the PR stays in Draft. Never continue past it.

**A gate halts:** still run the other gates of the same phase so the user sees the full picture, record every result (including the halted one as `blocked: <reason>`) in the PR body evidence table, and leave the PR in Draft. Push only under the constitution's Checkpoint exemption (one `chore(<scope>): SCRUM-<n> checkpoint before halt` commit on the Draft PR).

**Weak green:** `pnpm test` runs with `--passWithNoTests`. A green run where no test file touches the changed behaviour is not a pass: for every changed source file, name the test that covers it, or add one.

## Remote writes

Every write to Jira or GitHub (ticket edit, PR create/edit/ready, PR comment, reviewer, assignee) is shown as an exact preview and runs only on a yes given while that preview is on screen. Read every write back. Exception: after the PR's creation was approved, updating that PR's own evidence table, approval line and code-review comment in the same shape needs no new preview. Pushing the ticket's own feature branch is not a remote write that needs a gate; pushing to `main` is forbidden. Never merge, never call `transitionJiraIssue`.

**Spec Kit feature pointer:** each shell call starts fresh, so an `export` does not persist. Prefix every Spec Kit script call with `SPECIFY_FEATURE_DIRECTORY=<FEATURE_DIR>`, and before running a `speckit-*` skill write `.specify/feature.json` as `{"feature_directory": "<FEATURE_DIR>"}` (git-ignored) so it never points at another feature.

GitHub uses the `gh` CLI (the GitHub MCP server may be down). Jira uses the Atlassian MCP tools listed in `.claude/skills/create-implementation-item/tracker-reference.md`; load them with ToolSearch first.

## Phases

Create one todo per phase. Each phase has an entry check, actions, an exit gate, and an "If blocked" line. On any block: pause, tell the user the phase, the exact error, and the fix, and wait. Never redo a write that already succeeded.

### Phase 0. Input and resume

**Entry:** a Story key (`SCRUM-n`) or its URL. Older parents are `Task`s with Subtasks; treat them like a Story. A Subtask key: read it, switch to its parent Story, and say so. No key: ask for one; do not scope an idea here (that is `create-implementation-item`).

1. Read the Story with `getJiraIssue` (description, comments, links) and each Subtask.
2. **Delivery label:** exactly one of `feature`, `bug`, `maintenance`. None or several: ask which applies, with a recommendation from the Story text, then preview the `editJiraIssue` label change and apply it on a yes. Do this before any branch exists.
3. **Clarification Subtask** with unanswered questions that block a decision: list them and stop. A person resolves them first.
4. **Dependencies:** a `Depends on` / `is blocked by` link to a ticket that is not Done: name it and stop, unless the user says to go ahead.
5. **Resume table.** Run `git fetch -q origin` first. Check each in order and record what exists:

   | Check                                                                                             | If found                                                                                                                                                                                                                                            |
   | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | `git branch -a --list "*SCRUM-<n>-*"`                                                             | switch to it (`git switch <branch>`, tracking the remote branch if only that exists); if the working tree is dirty, stop and ask                                                                                                                    |
   | `git status --short` on the ticket's branch                                                       | uncommitted changes: list them and ask whether to commit them as part of this ticket or stop; never discard them                                                                                                                                    |
   | `grep -l "SCRUM-<n>" specs/*/spec.md`, then `ls -d specs/*-<slug>`                                | the spec dir: record it as `FEATURE_DIR` (a template `spec.md` from an interrupted run has no key yet, so also match by slug)                                                                                                                       |
   | `gh pr list --head <branch> --state open --json number,isDraft,url`                               | reuse that PR                                                                                                                                                                                                                                       |
   | PR body `Plan approved by` line (Phase 3)                                                         | the plan approval stands if `spec.md`, `plan.md` and `tasks.md` have not changed since the commit it names                                                                                                                                          |
   | `gh api repos/{owner}/{repo}/pulls/<n>/reviews --paginate --jq '.[] \| {state, commit_id, body}'` | a `CHANGES_REQUESTED` review newer than every `APPROVED` one: preview and run `gh pr ready <n> --undo` (back to Draft), then start Phase 4 with that review's findings as the list; this starts a new pre-review cycle with the return counter at 0 |
   | `tasks.md` boxes, PR body evidence table, the `implement-ticket:code-review` comment's SHA        | resume at the first phase whose exit gate is not met on the current head, checking phases in order (a half-done `tasks.md` does not skip an unmet Phase 3 exit); a gate result for an older SHA does not count                                      |

On every resume past Phase 1, also run Phase 1 step 3 (drift on `main` since the ticket or the branch point) and report new overlapping commits before continuing.

**Exit:** label settled, no blocking questions, and the phase to start at named in one line ("Resuming SCRUM-41 at Phase 4: branch and PR exist, 6/14 tasks done.").

### Phase 1. Verify the ticket against the code

**Entry:** a fresh run, or a resume before Phase 2's exit.

1. `git fetch -q origin main`. Read code from `origin/main` (a read-only worktree per `create-implementation-item` step 1 when the checkout is not a clean, current `main`).
2. Check every concrete claim in the Story and Subtasks: file paths, symbols, endpoints, schemas, `## Verified Against Codebase` lines, T-ids and E-ids. Use CodeGraph only if `.codegraph/` exists; otherwise Grep and Read.
3. Also check drift: commits on `main` since the ticket was written that touch the same files (`git log --since=<ticket updated date> -- <paths>`).
4. Write a **concerns list**. Each item has the claim, the evidence (`path:line` or commit), the impact, and the proposed ticket edit.

**Exit:**

- **No concerns:** say "Ticket matches `main` at `<sha>`." and continue.
- **Concerns:** show the list and the exact Jira edit (description diff per item) and ask "Update the ticket with these changes?" On yes: `editJiraIssue`, read back, rerun this phase. On no, or on a concern that needs a business decision: stop. The ticket is not ready.

**If blocked:** Jira unreadable (fix: reconnect the Atlassian connector).

### Phase 2. Branch and spec directory

**Entry:** Phase 1 exit, and the branch or (when Spec Kit applies) the spec dir is missing. Skip step 2 when the branch exists.

1. Prefix from label: `feature` → `feat`, `bug` → `fix`, `maintenance` → `chore`. Slug: 2-5 lowercase words from the Story summary.
2. `git fetch -q origin main && git switch -c <prefix>/SCRUM-<n>-<slug> origin/main`. Never reuse or rename the user's other branches; if the checkout is dirty, stop and ask.
3. Spec Kit applies (see the gates table) and no spec dir was found in Phase 0:
   - If an existing `specs/<dir>/` owns this scope (Phase 1 or the Story names it), reuse it as `FEATURE_DIR`.
   - Otherwise run `.specify/scripts/bash/create-new-feature.sh --json --short-name <slug> "<Story summary>"`. It creates `specs/NNN-<slug>/spec.md` and `.specify/feature.json` and does **not** create a branch. Record `FEATURE_DIR` (see "Spec Kit feature pointer").

**Exit:** on the new branch; spec dir recorded (or "Spec Kit not applicable: <label>, <reason>").

### Phase 3. Spec Kit (skipped when not applicable)

**Entry:** Phase 2 exit, Spec Kit applies.

1. Run, in order, passing the Story and its Subtasks (description, acceptance criteria, edge cases, decisions) as the input, with the Story key and URL in the first lines of `spec.md` (`**Jira**: SCRUM-<n> <url>`) so a resume finds it: `speckit-specify`, `speckit-clarify`, `speckit-checklist`, `speckit-plan`, `speckit-tasks`, `speckit-analyze`. Reuse, don't regenerate, artifacts that already exist on the branch.
2. `speckit-clarify` questions the Story already answers: answer them from the Story and cite it. Questions it doesn't: ask the user.
3. Resolve every CRITICAL `speckit-analyze` finding, rerunning the affected command.
4. Commit `docs: SCRUM-<n> add spec, plan and tasks`, push the branch with `git push -u origin <branch>`, and open the Draft PR if none exists (see "Opening the Draft PR").
5. **Pause for people.** Say: "Plan ready for approval in `<FEATURE_DIR>`. Please review `spec.md`, `plan.md`, `tasks.md`, tick the items in `checklists/`, and reply 'approved'."

**Exit:** an explicit approval from the user, and every checklist item ticked by a person. Record the approval as a line in the PR body: `Plan approved by <name> on <date> at <commit sha>`, so a later session can resume without asking again. If any checklist item is open and you are asked whether to proceed: answer "no" and stop. Only a person may override.

### Opening the Draft PR

The first push of the branch opens the PR, whatever the label: in Phase 3 step 4 when Spec Kit applies, otherwise at the Phase 4 exit. Preview, then `gh pr create --draft --base main --title "[SCRUM-<n>] <outcome>" --body-file <filled pr-template.md>`, and read back the URL. Skip when Phase 0 found a PR.

### Phase 4. Implement and unit gate

**Entry:** Phase 3 exit, or Phase 2 exit when Spec Kit doesn't apply, or a return from Phase 5 with a findings list.

1. Spec mode: run `speckit-implement`. Maintenance mode: work through the Story's acceptance criteria and the Subtasks' `## Todo` in order. Returning from Phase 5: fix only the listed findings.
2. TDD for every behaviour change (`superpowers:test-driven-development`): write the test, run it, record the RED output (a compile or setup error is not RED), implement the minimum, record GREEN. A `bug` ticket starts with the test that reproduces the bug.
3. If implementation exposes a gap or contradiction in `spec.md`/`plan.md`/the ticket: stop and report it. Don't silently rewrite the approved contract.
4. Commit small, buildable steps: `<type>(<scope>): SCRUM-<n> <summary>`.
5. **Unit gate** on the head commit, per the label (see the gates table). Save each command's exit code and the key lines.
6. Update `tasks.md` boxes to what is really done and verified, and the PR body evidence table (`pr-template.md`).

**Exit:** every unit-gate command exits 0 on the head SHA. Push; open the Draft PR if none exists ("Opening the Draft PR"); record the results in its body.

**If blocked:** a gate command is missing (see "Missing command"); a test fails and the fix is out of scope; the handwritten diff passes 300 lines (`git diff --stat origin/main...HEAD`, excluding lockfiles, generated files, `specs/**`, `apps/web/e2e/**`): stop and propose a split.

### Phase 5. Pre-review: code review and e2e

**Entry:** Phase 4 exit on the current head. A return counter starts at 0 and is stored in the code-review comment as `round=<returns + 1>`.

1. **Code review** of `git diff origin/main...HEAD` with the `code-review` skill at `high` effort. Add the area checklists the diff touches:
   - `apps/web/**`: load `vercel-react-best-practices` and apply `docs/Frontend-Conventions.md` (semantic tokens only, no raw palette or arbitrary values).
   - `apps/api/**`: apply `docs/Backend-Conventions.md` (AppError, `validate()`, route → controller → service → Prisma).
   - `packages/shared/**`: constitution Principle I (one Zod schema, `!` for breaking changes).
2. Post or update **one** PR comment whose first line is `<!-- implement-ticket:code-review head=<sha> round=<k> -->`, followed by a table: `| # | Severity | File:line | Finding | Disposition |`. Disposition is `fixed in <sha>`, `justified: <reason>`, or `open`. Preview the first post; later updates to the same comment follow the same text shape and need no new gate.
3. **e2e** (the diff touches `apps/web`, whatever the label):
   - Write `apps/web/e2e/scrum-<n>-<slug>.spec.ts`. One `test()` per acceptance criterion and per E-id the UI exposes (every Story E-id is UI-exposed unless the Story or a Subtask marks it `(API only)`), titled `AC<k>: ...` / `E<k>: ...`.
   - A `maintenance` Story has no Spec Kit and may have no acceptance criteria: cover the flows the change could affect (constitution, Principle IV); for a `bug`, the failing flow. Title those tests after the flow, not `AC<k>`.
   - Locate by role, label and text (`getByRole`, `getByLabel`, `getByText`), never by CSS class. No `waitForTimeout`; wait on visible state.
   - Run `pnpm --filter @launchly/web test:e2e`. Record the result in the PR body. Commit the specs: `test(web): SCRUM-<n> add e2e specs`.
4. **Decide:**
   - Any `open` Critical or Important finding, or any e2e failure: go back to Phase 4 with that list; returns + 1.
   - A 4th return would start (3 returns already used): **halt.** Push a checkpoint commit `chore(<scope>): SCRUM-<n> checkpoint before halt` if the tree has unbuildable work, leave the PR in Draft, and report what failed in each round.

**Exit:** no open Critical or Important findings, e2e green (when required), all for the current head SHA.

### Phase 6. Ready for review

**Entry:** Phase 4 and Phase 5 exits. Commits after the code-review comment's `head=` SHA may only add e2e specs, tests or docs; any other change goes back to Phase 5.

1. Rerun the Phase 4 unit gate if any commit landed after it.
2. Update the PR body: final evidence table, RED/GREEN evidence, e2e result, code-review comment link, Jira link `https://hcmut-team-vmaq1hvy.atlassian.net/browse/SCRUM-<n>`.
3. Preview, then `gh pr ready <n>`. Read back `isDraft: false`.

### Phase 7. Assign the reviewer

1. Ask: "Who should review this PR?" with the reviewer names from the config's People table as options.
2. Resolve the person:
   - In the config: use their GitHub login and Jira accountId.
   - Not in the config: `lookupJiraAccountId` with the name, ask for the GitHub login, show both, and confirm. Offer to save the row to `.claude/create-implementation-item.md`.
   - The reviewer must not be the person who handed you the ticket if the user says they wrote the code; the constitution requires an independent review.
3. Preview both writes together, then on a yes:
   - `gh pr edit <n> --add-reviewer <login>`
   - `editJiraIssue` on the Story: assignee = accountId
4. Read both back. Do not transition the ticket.

### Final report

The PR URL, the gate table for the head SHA, the code-review round count, the reviewer, and: "Reviewer: run `review-implementation <PR URL>` in your own session."

## Red Flags: STOP

| Thought                                                                 | Reality                                                               |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------- |
| "`coverage:changed` doesn't exist yet, I'll note it and move on"        | A missing gate command blocks. Halt and name the prerequisite ticket. |
| "Coverage is 78 %, close enough"                                        | The gate is ≥80 % lines and branches per changed file. Add tests.     |
| "The ticket is slightly off, I'll just implement what makes sense"      | Phase 1: show the concerns and the exact ticket edit, and wait.       |
| "The checklist items are obviously fine, I'll tick them"                | Only a person ticks checklist items. Answer "no" and stop.            |
| "The user said go earlier, so the plan is approved"                     | Approval comes after the Phase 3 pause, for the artifacts on screen.  |
| "One more fix round and it'll pass"                                     | Three rounds, then halt with a checkpoint on the Draft PR.            |
| "e2e is flaky, I'll add a wait" / "I'll skip the failing spec"          | Fix the cause or report it. No `waitForTimeout`, no `.skip`.          |
| "The reviewer is obvious, I'll assign them"                             | Ask, preview, then assign.                                            |
| "Everything is green, I'll move the ticket to In Review" / "I'll merge" | People transition tickets and merge.                                  |
| "The gate passed on an earlier commit"                                  | Gates count only for the current head SHA.                            |
