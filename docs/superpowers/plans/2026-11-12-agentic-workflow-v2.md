# Agentic Workflow v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Skill files are written with superpowers:writing-skills.

**Goal:** Replace the current seven-stage agent workflow with four skills: `create-implementation-item` (scope and publish), `implement-ticket` (verify, Spec Kit, unit tests, draft PR, review, e2e, assign reviewer) and an evolved `review-implementation` (reviewer verdict posted to GitHub). Then align the constitution, AGENTS.md and CONTRIBUTING.md with it.

**Architecture:** Everything is Markdown skill files under `.claude/skills/` plus the governance docs. Nothing in `apps/` or `packages/` changes. The coverage and Playwright tooling the gates call is delivered by two separate prerequisite tickets (Task 6). Until those land, `implement-ticket` halts at the gate that needs the missing command; it never skips the gate.

**Tech Stack:** Claude Code skills, GitHub Spec Kit 1.3.1 (`.specify/`), Atlassian MCP (Jira `SCRUM`), `gh` CLI, Vitest, Playwright (after prerequisite).

**Spec:** the decisions agreed in the 2026-11-12 session, restated in "Agreed decisions" below. The source pattern is `~/Personal/agentic-workflow/skills/create-implementation-item/`.

## Agreed decisions

1. Stages 1–2 (draft issue, publish issue) are replaced by a port of `create-implementation-item`. Its Gate 1 (a yes given while the write table is on screen) is the human approval of the ticket.
2. Stages 3–4 plus the old test, PR and reviewer-assignment steps become one skill, `implement-ticket`, with phases.
3. Branch: `implement-ticket` creates `<type>/SCRUM-<n>-<slug>` itself. `create-new-feature.sh` in this Spec Kit version only creates `specs/NNN-<slug>/` and writes `.specify/feature.json`; it creates no branch, so no workaround is needed.
4. Unit tests must pass. Feature tickets also need ≥80 % line **and** branch coverage on changed source files.
5. The second check is the e2e stage: Playwright, for feature tickets whose diff touches `apps/web`.
6. The maintenance exemption stays. A ticket labelled `maintenance` skips the Spec Kit phases, the 80 % gate and e2e. A `bug` ticket skips the 80 % gate and e2e but still needs a test that fails without the fix.
7. `review-implementation` evolves in place: it reruns every gate on the head SHA, reads the code-review comment and the e2e specs, and posts one GitHub review (approve or request changes, with inline comments) after the reviewer confirms the exact text.
8. Coverage tooling and the Playwright harness are separate prerequisite tickets.

## Global Constraints

- The constitution wins over AGENTS.md, CONTRIBUTING.md and skills. Task 1 lands first, and every later file must agree with it.
- All docs and skills are in English (AGENTS.md).
- Jira: site `https://hcmut-team-vmaq1hvy.atlassian.net`, cloud ID `bec02efe-55db-40ac-a5fc-4b23fd1c1674`, project `SCRUM`. Types are `Epic`, `Story`, `Task`, `Subtask`; there is no `Bug` type, so bugs are a `Task` labelled `bug`.
- Jira item shape: a business-level parent `Story`, with one `Subtask` per touched area (`api`, `web`, `shared`, `db`). `implement-ticket` takes the **Story** key and delivers it on one branch, one Spec Kit feature and one PR.
- Delivery labels on the Story: exactly one of `feature`, `bug`, `maintenance`. It decides which gates apply.
- GitHub writes use the `gh` CLI. The GitHub MCP server is currently failing to connect and must not be required.
- Human-only actions: merge, ticket transitions, ticking checklist items, approving the plan. Agents may set the Jira assignee and the PR reviewers only in `implement-ticket` phase 7, and only for a person the user named in that run.
- Every remote write (Jira edit or create, PR create or edit, GitHub review) shows an exact preview and needs a yes given while that preview is on screen.
- Stage-5 failure loop: at most 3 rounds back to implementation. After that, halt and push a checkpoint commit `chore(<scope>): SCRUM-<n> checkpoint before halt`; the PR stays in Draft.
- Handwritten diff limit stays at ≤300 lines, excluding generated files, lockfiles, `specs/**` and `apps/web/e2e/**`.
- Commands the gates call (delivered by Task 6's tickets): `pn test:coverage` then `pn coverage:changed`, which exits non-zero when any changed `src/**` file is under 80 % lines or branches and prints a per-file table; and `pn --filter @launchly/web test:e2e`, the Playwright suite in `apps/web/e2e/`.
- This plan's own branch is `chore/SCRUM-<KEY>-agentic-workflow-v2`. The user supplies `<KEY>` before Task 1, and commits use scope-less `docs:` / `chore:` with that key.

## Review Focus

1. **Rerun after an interruption:** `implement-ticket` is started again on a Story that already has a branch, spec dir or Draft PR. Expected: it detects and reuses each one and resumes at the first unfinished phase, with no duplicate branch, spec or PR. (Task 3, Phase 0 resume table.)
2. **Missing prerequisite command** (`coverage:changed` or `test:e2e` not defined). Expected: halt naming the prerequisite ticket, never mark the gate passed or skipped. (Task 3, Phases 4 and 5.)
3. **Story with no delivery label, or more than one.** Expected: ask which one applies and propose the label edit through the preview gate, before any branch exists. (Task 3, Phase 0.)
4. **Named reviewer not in the config people table.** Expected: look up the Jira account (`lookupJiraAccountId`), ask for the GitHub login, show both and confirm, then offer to save them to the config. (Task 3, Phase 7.)
5. **Reviewer's rerun disagrees with the implementer's code-review comment or test evidence.** Expected: the mismatch is an Important finding, and the fresh run is what counts. (Task 4.)

---

### Task 1: Constitution v2.0.0 and CONTRIBUTING.md

**Files:**
- Modify: `.specify/memory/constitution.md` (Sync Impact Report; "Development Workflow and Quality Gates"; Principle IV; version line)
- Modify: `CONTRIBUTING.md` ("Workflow" section)

- [ ] **Step 1:** Run `/speckit-constitution` with the agreed decisions. Version `1.2.0 → 2.0.0` (MAJOR: the review and human-ownership gates are redefined). `Last Amended: 2026-11-12`.
- [ ] **Step 2:** Rewrite "Development Workflow and Quality Gates" with these bullets:
  - **Tracking:** unchanged.
  - **Scoping:** `create-implementation-item`, ending at its Gate 1.
  - **Spec-driven features:** unchanged gates, entered through `implement-ticket`.
  - **Maintenance exemption:** keep; add the `maintenance` label rule.
  - **Bug fixes:** the `bug` label; a failing-first test.
  - **Local gates:** typecheck, lint and test, plus `coverage:changed` ≥80 % lines and branches for `feature`, plus Playwright e2e for `feature` tickets that touch `apps/web`.
  - **Pre-review:** Draft PR; automated code review (Next.js/React best practices for `apps/web`, `docs/Backend-Conventions.md` for `apps/api`) posted as a PR comment; at most 3 fix rounds.
  - **Checkpoint exemption:** unchanged.
  - **Review:** the reviewer runs `review-implementation` in their own session, reruns the gates and posts the GitHub review.
  - **Human ownership:** add the reviewer-assignment exception.
- [ ] **Step 3:** Principle IV: add the coverage rule and the e2e rule, with the label scoping from decision 6. Remove the "no tests exist yet" rationale line, since tests now exist.
- [ ] **Step 4:** CONTRIBUTING.md "Workflow": replace steps 4–5 with the Draft PR → ready → reviewer flow, and add the two new commands to the pre-push list.
- [ ] **Step 5: Verify.** Run `grep -n "2.0.0\|coverage:changed\|test:e2e\|implement-ticket" .specify/memory/constitution.md CONTRIBUTING.md`. Expected: every term appears, and nothing names `create-implementation-issue` or `publish-jira-issue`. Then run `pn format:check`, which should pass.
- [ ] **Step 6: Commit.** `docs: SCRUM-<KEY> amend constitution to 2.0.0 for workflow v2`

### Task 2: Port `create-implementation-item` and retire stages 1–2

**Files:**
- Create: `.claude/skills/create-implementation-item/SKILL.md`, `tracker-reference.md`, `parent-item-contract.md`, `implementation-issue-contract.md` (copied from the source dir, then adapted)
- Create: `.claude/create-implementation-item.md` (filled project config)
- Delete: `.claude/skills/create-implementation-issue/`, `.claude/skills/publish-jira-issue/`
- Not copied: `code-host-reference.md` (implementation items are Jira Subtasks, not GitHub issues)

**Interfaces:**
- Produces: a Jira Story with exactly one delivery label, `## Acceptance Criteria`, and one Subtask per area. Each Subtask body follows `implementation-issue-contract.md`, so it has `## Technical Acceptance Criteria` T-ids and `## Edge Cases` E-ids. `implement-ticket` Phase 1 reads these by heading.

- [ ] **Step 1:** Copy the files, then adapt `SKILL.md`:
  - Step 0.2 points at `.claude/create-implementation-item.md`.
  - Step 1 code baseline: one component repo, which is this repo.
  - Steps 2 and 6 use Jira only. The duplicate check searches the Story's Subtasks, not code-host issues.
  - Step 5 drafts a Subtask per area.
  - Step 6 Gate 1 rows are: create Story (+ label), create Subtasks, link. No `.tmp/` files.
  - Add a final wrap-up line: "Next: run `implement-ticket SCRUM-<n>`."
- [ ] **Step 2:** Trim `tracker-reference.md` to its Jira sections, and name the Atlassian MCP tools used: `getJiraIssue`, `searchJiraIssuesUsingJql`, `createJiraIssue`, `editJiraIssue`, `createIssueLink`, `addCommentToJiraIssue`, `lookupJiraAccountId`.
- [ ] **Step 3:** Write `.claude/create-implementation-item.md` from `project-config.md`, with these values:
  - Tracker: Jira, site and project as in Global Constraints; parent type `Story`; status `To Do`.
  - Clarification sub-item: `Requirements Clarification`.
  - Components: `api`, `web`, `shared`, `db`, all in repo `github:<owner>/Launchly` with local path `.`, allowed branch `main` and worktree branch `main`.
  - Implementation items: "tracker sub-items under the parent".
  - Tests table: api uses Vitest + supertest; web uses Vitest with Playwright in `apps/web/e2e/`.
  - Code index: CodeGraph (`codegraph sync`).
  - Knowledge sources: `docs/`, `specs/`, Confluence.
  - People table columns: Role | Name | Jira accountId | GitHub login. The user fills it; leave it empty if unknown.
- [ ] **Step 4:** Update the references found by `grep -rln "create-implementation-issue\|publish-jira-issue\|jira-issues" . --exclude-dir={node_modules,.tmp,.git}`: `review-implementation` (handled in Task 4) and `AGENTS.md` (Task 5). Leave `.tmp/jira-issues/` drafts untouched; they are ignored history.
- [ ] **Step 5: Pressure test.** Dispatch a fresh subagent with: "Using `.claude/skills/create-implementation-item`, scope the idea 'recruiters can duplicate a job posting'. Draft-only run: skip tracker writes." Expected: one question per message; a scoping summary that ends with "Is this right?"; then an inline Story draft plus Subtask drafts with T-ids, and a Gate 1 table. No files written and no Jira calls that write.
- [ ] **Step 6: Commit.** `chore: SCRUM-<KEY> replace issue drafting skills with create-implementation-item`

### Task 3: `implement-ticket` skill

**Files:**
- Create: `.claude/skills/implement-ticket/SKILL.md`
- Create: `.claude/skills/implement-ticket/pr-template.md` (PR body: Jira link, mode, gate evidence table, RED/GREEN evidence, e2e result)

**Interfaces:**
- Consumes: the Story shape from Task 2; the commands from Global Constraints.
- Produces:
  - A Draft PR, later ready, titled `[SCRUM-<n>] <outcome>`.
  - One PR comment headed `<!-- implement-ticket:code-review head=<sha> -->` with the review findings and their disposition.
  - Committed e2e specs at `apps/web/e2e/scrum-<n>-<slug>.spec.ts`.
  - The Jira assignee and GitHub reviewers set.
  - Task 4 consumes the comment marker and the spec path.

- [ ] **Step 1: Write the phases, each with entry check, actions, exit gate and "If blocked".**
  - **Phase 0, input and resume.** Accept a Story key or URL; read it with `getJiraIssue`, including Subtasks. Validate the delivery label (Review Focus 3). Resume table: an existing branch → switch to it; an existing `specs/*` whose `spec.md` cites the key → set `SPECIFY_FEATURE_DIRECTORY`; an existing PR (`gh pr list --head <branch>`) → reuse it. Start at the first unfinished phase.
  - **Phase 1, verify the ticket against the code.** Check every Subtask claim (paths, symbols, T-ids) with CodeGraph on `origin/main`. Output a concerns list where each item has the claim, the evidence and a proposed edit. If there are concerns: show the exact Jira edit preview, wait for a yes, run `editJiraIssue`, read it back, and re-run Phase 1. If the user declines, stop. If there are none, say so in one line.
  - **Phase 2, branch and spec.** `git fetch origin main && git switch -c <feat|fix|chore>/SCRUM-<n>-<slug> origin/main`. The prefix comes from the label: feature → `feat`, bug → `fix`, maintenance → `chore`. For `feature` and `bug` tickets that change behaviour, run `.specify/scripts/bash/create-new-feature.sh --json --short-name <slug> "<Story summary>"` and record `FEATURE_DIR`. For `maintenance`, skip this.
  - **Phase 3, Spec Kit** (skipped for `maintenance`): specify, clarify, checklist, plan, tasks, analyze, each using the Story and Subtasks as input. Commit the artifacts as `docs: SCRUM-<n> add spec, plan and tasks`, push, and open the **Draft PR** now so the artifacts are reviewable. Then **pause**: ask the user to approve the plan and tick the checklists. Resume only after an explicit approval. Open checklist items mean answering "no" and stopping.
  - **Phase 4, implement and unit gate.** Run `speckit-implement` for spec mode, or work against the acceptance criteria directly for maintenance, using TDD with RED/GREEN evidence. Gate: `pn typecheck`, `pn lint`, `pn test`; for `feature`, also `pn test:coverage && pn coverage:changed`. Record each command, its exit code and the key output lines in the PR body evidence table.
  - **Phase 5, pre-review.**
    - Run `/code-review` on the diff against `origin/main`. When the diff touches `apps/web`, load `vercel-react-best-practices` and apply `docs/Frontend-Conventions.md`. When it touches `apps/api`, apply `docs/Backend-Conventions.md`.
    - Post or update the marker comment.
    - For a `feature` that touches `apps/web`: write Playwright specs covering each Story acceptance criterion and edge case (E-ids) that the UI exposes, then run `pn --filter @launchly/web test:e2e`.
    - Any Critical or Important review finding, or any e2e failure, goes back to Phase 4 with the finding list; increment the round counter, which is at most 3 (Global Constraints).
  - **Phase 6, ready.** All gates are green on the head SHA. Update the PR body and run `gh pr ready`.
  - **Phase 7, assign the reviewer.** Ask who reviews. Resolve them from the config people table or the Review Focus 4 path. Preview: `gh pr edit <n> --add-reviewer <login>` plus Jira `editJiraIssue` assignee = accountId. After a yes, run both and read them back. Never transition the ticket.
  - Final report: the PR URL, the gate table, the reviewer, and "Reviewer: run `review-implementation <PR>`."
- [ ] **Step 2:** Add a Red Flags table covering:
  - skipping a gate because its command is missing;
  - ticking checklists;
  - editing Jira without a preview;
  - a fourth fix round;
  - marking the PR ready with any gate red;
  - transitioning the ticket.
- [ ] **Step 3: Pressure test A (resume).** In a scratch worktree with a branch `feat/SCRUM-999-demo` and `specs/099-demo/spec.md` citing SCRUM-999, a subagent is told: "run implement-ticket SCRUM-999, describe the actions, perform no writes". Expected: it reuses the branch and spec dir and starts at Phase 3 or later.
- [ ] **Step 4: Pressure test B (missing prerequisite).** In the same setup, with no `coverage:changed` script, the subagent is told: "you are at Phase 4 for a feature ticket, tests pass". Expected: it halts and names the coverage prerequisite ticket; it does not continue to Phase 5.
- [ ] **Step 5: Commit.** `chore: SCRUM-<KEY> add implement-ticket skill`

### Task 4: Evolve `review-implementation`

**Files:**
- Modify: `.claude/skills/review-implementation/SKILL.md` (Boundaries, sections 2–6)

**Interfaces:**
- Consumes: the `implement-ticket:code-review` marker comment, `apps/web/e2e/scrum-<n>-*.spec.ts`, and the PR body evidence table (from Task 3).
- Produces: one GitHub review on the head SHA, plus the local report in `.tmp/reviews/<key>-<sha>.md`, which is kept.

- [ ] **Step 1:** Boundaries: the skill stays read-only for repo files, Jira and merges. It may post **one** GitHub review after the reviewer confirms the exact body, verdict and inline comments. Independence: it runs in the reviewer's own session; record `gh api user --jq .login`. It still refuses Draft PRs.
- [ ] **Step 2:** Section 2 contract: Jira from the Story and its Subtasks, using `getJiraIssue`. Remove the `.tmp/jira-issues/` fallback; if Jira can't be read, ask the user to paste the ticket. The label decides which gates apply (decision 6).
- [ ] **Step 3:** Section 3 fresh verification: rerun typecheck, lint, test, `coverage:changed` (feature) and `test:e2e` (feature touching web) on the head SHA in a scratch worktree. Compare the results with the PR evidence table; a mismatch is Important (Review Focus 5).
- [ ] **Step 4:** Section 4: add area 10, "Pre-review artifacts".
  - The marker comment exists for the head SHA, and each Critical or Important item in it is fixed or justified.
  - The e2e specs cover every UI-exposed acceptance criterion and edge case, assert behaviour (roles and text, not CSS classes) and avoid fixed sleeps.
- [ ] **Step 5:** New section 7, "Post the review".
  - Build the payload: verdict `APPROVE` or `REQUEST_CHANGES`, a summary body (the verdict line, the gate table and the counts by severity), and inline comments for findings that have a file and line.
  - Show it, wait for a yes, then run `gh api repos/{owner}/{repo}/pulls/<n>/reviews -f commit_id=<sha> -f event=<EVENT> -f body=@<file> --input <comments.json>`, and read it back.
  - `REJECTED` maps to `REQUEST_CHANGES`; `APPROVED` maps to `APPROVE`.
- [ ] **Step 6: Pressure test.** A subagent is given a fake PR context where the evidence table claims coverage of 85 % but the rerun shows 70 %. Expected: an Important finding and `REJECTED`, with the payload previewed and not posted.
- [ ] **Step 7: Commit.** `chore: SCRUM-<KEY> make review-implementation rerun gates and post the GitHub review`

### Task 5: AGENTS.md and CLAUDE.md

**Files:**
- Modify: `AGENTS.md` ("Agent skills and delivery workflow" section; the `Tests are colocated` paragraph)
- Keep: `CLAUDE.md` stays `@AGENTS.md`. The workflow lives in AGENTS.md, so Codex and other agents read the same text.

- [ ] **Step 1:** Replace the skills table with these rows:
  - `create-implementation-item`
  - `implement-ticket`
  - `review-implementation`
  - one combined `speckit-*` row noting that `implement-ticket` drives them

  Replace the "Flow:" paragraph with this 4-stage flow, marking the human gates:
  1. **scope** (`create-implementation-item`): Gate 1 → Story and Subtasks.
  2. **deliver** (`implement-ticket` phases 0–7): ⛔ ticket edit, ⛔ plan and checklist approval, ⛔ reviewer choice.
  3. **review** (the reviewer's `review-implementation`): ⛔ review post.
  4. **a person merges and moves the ticket.**
- [ ] **Step 2:** Add the delivery-label to gate table (feature / bug / maintenance × Spec Kit / 80 % changed coverage / e2e), plus the two prerequisite commands and their status ("not yet available: SCRUM-<cov>, SCRUM-<e2e>").
- [ ] **Step 3: Verify.** `grep -rn "create-implementation-issue\|publish-jira-issue\|jira-issues" AGENTS.md CONTRIBUTING.md .specify/memory .claude/skills` returns nothing; `pn format:check` passes.
- [ ] **Step 4: Commit.** `docs: SCRUM-<KEY> describe workflow v2 in AGENTS.md`

### Task 6: Prerequisite tickets (dogfood the new scoping skill)

**Files:** none in the repo. The output is two Jira Stories, each labelled `maintenance` (tooling under the exemption).

- [ ] **Step 1:** Run `create-implementation-item` in Idea mode for **"Changed-file coverage gate"**. Scope:
  - Add `@vitest/coverage-v8`, pinned exact (justified under constitution Principle VI).
  - Add a `test:coverage` script per package.
  - Add a root `pn coverage:changed` script, `scripts/coverage-changed.mjs`. It reads each package's `coverage/coverage-summary.json`, filters to the `src/**` files in `git diff --name-only origin/main...HEAD` (excluding `*.test.ts`, `generated/`, `*.d.ts`), fails on any file under 80 % lines or branches, and passes when there are no changed source files.
- [ ] **Step 2:** Run it again for **"Playwright e2e harness for web"**. Scope:
  - `@playwright/test` and `apps/web/playwright.config.ts`, with a `webServer` that starts the API and web against the 5433 database seeded by the demo seed.
  - A `test:e2e` script in `apps/web`, with specs in `apps/web/e2e/`.
  - One smoke spec covering the job search page.
  - Chromium only.
- [ ] **Step 3:** Each passes its Gate 1 with the user. Put the returned keys into the AGENTS.md status line (Task 5 Step 2) and commit `docs: SCRUM-<KEY> link prerequisite tickets`.

### Task 7: Whole-branch check and PR

- [ ] **Step 1:** Run `pn format:check && pn lint`. Both should pass; the skills are Markdown, so this checks Prettier only.
- [ ] **Step 2:** Run a cross-file consistency read: the constitution's gate list equals the AGENTS.md gate table, which equals the `implement-ticket` Phase 4–5 gates, which equal the `review-implementation` section 3 rerun list. Fix any drift.
- [ ] **Step 3:** Push, then open a PR titled `[SCRUM-<KEY>] Agentic workflow v2` as **ready for review**, since this is a docs and skills change. Its body states that the constitution amendment needs approval from a team member other than the author (Governance).
