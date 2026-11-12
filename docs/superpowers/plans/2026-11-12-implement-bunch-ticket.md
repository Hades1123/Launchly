# implement-bunch-ticket Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a repo skill `implement-bunch-ticket` that delivers one wave of Jira tickets per run (analyse → clarify once → approved plan → Jira moves → TDD build → agent review + e2e → one branch, one PR), plus the rule exception that allows it.

**Architecture:** A `SKILL.md` drives the agent through ten steps. The two deterministic parts (reading a wave out of the wave-plan markdown, and spreading tickets evenly over people) are small Node ES-module scripts with `node:test` tests, so the agent calls them instead of improvising. Two templates (wave plan, PR body) fix the shape of the artifacts. `AGENTS.md` and the constitution get the exception text.

**Tech Stack:** Markdown skills (Claude Code), Node.js ESM + `node:test` (Node from `.nvmrc`, no new dependencies), Atlassian MCP, `gh` CLI, existing `pnpm` gates.

**Spec:** `docs/superpowers/specs/2026-11-12-implement-bunch-ticket-design.md`

## Global Constraints

- Branch: all work on `chore/agentic-workflow-v2`. Never push to `main`, never merge.
- Skill location: `.claude/skills/implement-bunch-ticket/`. `SKILL.md` ≤ ~300 lines; longer reference text goes to sibling files.
- No new npm dependencies (Principle VI). Scripts use only Node built-ins.
- Wave plan input format: `## Wave <n> — <title>` sections, table columns exactly `Key | Ticket | Area | Label | Pts | Depends on`.
- Wave 0 is never run by the skill.
- Jira: cloud ID `bec02efe-55db-40ac-a5fc-4b23fd1c1674`, project `SCRUM`, sprint field `customfield_10020`, target sprint = the active sprint (today `SCRUM Sprint 3`, id 4).
- Wave branch `feat/wave-<n>-<slug>`; commits `<type>(<scope>): SCRUM-n <summary>`; PR title `[SCRUM-a, SCRUM-b, …] Wave <n>: <outcome>`.
- Fix rounds after agent review: max 3, then Draft PR + checkpoint (existing Checkpoint exemption); tickets stay In Progress.
- Rule changes are defined by the team: no amendment PR, no second-teammate approval; the skill comments on each Jira ticket that it runs under this exception.
- Commit messages in this repo end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Wave heading typed with `-`, `–` or `—`, or wave asked as `1`, `wave 1`, `Wave 1` → all resolve to the same wave.
2. `Depends on` cell `—`, `-`, empty, or keys with extra text (`SCRUM-41 (rounds)`) → clean key list, `[]` when none.
3. A wave name that matches no heading, or two headings with the same number → clear error naming the available waves; never a silent empty wave.
4. Fewer people than tickets, or exactly one person → every ticket still assigned, per-person counts differ by at most 1.
5. Empty people list → error, never tickets left unassigned silently.

Tests for each are in Task 1 (items 1–3) and Task 2 (items 4–5).

---

## File Structure

| File | Responsibility |
| --- | --- |
| `.claude/skills/implement-bunch-ticket/scripts/parse-wave.mjs` | `parseWave(markdown, waveName)` + CLI: wave section → ticket list JSON |
| `.claude/skills/implement-bunch-ticket/scripts/parse-wave.test.mjs` | `node:test` tests for the parser |
| `.claude/skills/implement-bunch-ticket/scripts/assign.mjs` | `assignBalanced(keys, people, rng)` + CLI: balanced random assignees |
| `.claude/skills/implement-bunch-ticket/scripts/assign.test.mjs` | `node:test` tests for assignment |
| `.claude/skills/implement-bunch-ticket/wave-plan-template.md` | shape of `specs/wave-<n>-<slug>/plan.md` |
| `.claude/skills/implement-bunch-ticket/pr-template.md` | shape of the wave PR body |
| `.claude/skills/implement-bunch-ticket/SKILL.md` | the ten-step procedure, red flags |
| `AGENTS.md` | skill table row + flow note + exception |
| `.specify/memory/constitution.md` | exception bullet, version 2.0.0 → 2.1.0 |

---

### Task 1: Wave parser

**Files:**
- Create: `.claude/skills/implement-bunch-ticket/scripts/parse-wave.mjs`
- Test: `.claude/skills/implement-bunch-ticket/scripts/parse-wave.test.mjs`

**Interfaces:**
- Produces: `export function parseWave(markdown: string, waveName: string): { number: number, title: string, tickets: Ticket[] }` where `Ticket = { key: string, title: string, areas: string[], label: string, points: number | null, dependsOn: string[] }`. Throws `Error` on unknown/duplicate wave or missing columns.
- CLI: `node parse-wave.mjs <file> "<wave>"` prints the result as JSON (2-space indent) and exits 0; on error prints the message to stderr and exits 1.

- [ ] **Step 1: Write the failing tests** in `parse-wave.test.mjs` using `node:test` and `node:assert/strict`, with an inline fixture containing `## Wave 0 — In flight`, `## Wave 1 — Foundations` (two rows: `SCRUM-46 | Set up Playwright | web | maintenance | 3 | —` and `SCRUM-51 | Round format | api, web | feature | 2 | SCRUM-41 (rounds), SCRUM-29`) and `## Wave 2 - Core` (hyphen dash, one row `SCRUM-53 | Job detail page | web | feature | 3 | -`). Tests:
  - `parses wave by "Wave 1"`: `number === 1`, `title === 'Foundations'`, `tickets.map(t => t.key)` deep-equals `['SCRUM-46', 'SCRUM-51']`.
  - `accepts "1" and "wave 1"`: both return the same object as `"Wave 1"`.
  - `accepts hyphen and en dash headings`: `parseWave(md, 'Wave 2').title === 'Core'`.
  - `splits areas and depends`: SCRUM-51 → `areas` `['api','web']`, `dependsOn` `['SCRUM-41','SCRUM-29']`, `points === 2`, `label === 'feature'`.
  - `empty depends is []`: SCRUM-46 and SCRUM-53 → `dependsOn` `[]`.
  - `unknown wave lists available`: `parseWave(md, 'Wave 9')` throws `/Wave 9 not found.*Wave 0, Wave 1, Wave 2/`.
  - `duplicate wave throws`: fixture with two `## Wave 1` headings throws `/duplicate.*Wave 1/i`.
  - `missing column throws`: wave table without `Depends on` column throws `/missing column.*Depends on/i`.
  - `points "—" is null`: row with `Pts` `—` → `points === null`.

- [ ] **Step 2: Run tests, expect failure**

Run: `node --test .claude/skills/implement-bunch-ticket/scripts/`
Expected: FAIL, `Cannot find module` / `parseWave is not a function`.

- [ ] **Step 3: Implement `parseWave` and the CLI in `parse-wave.mjs`**

Headings match `/^##\s+Wave\s+(\d+)\s*[—–-]\s*(.+)$/m`. Wave argument: strip a leading `wave` (case-insensitive) and whitespace, then parse the integer. Section = text up to the next `## ` heading. First markdown table in the section; header cells trimmed and matched by exact name. Keys extracted with `/SCRUM-\d+/g` (key cell takes the first match; `Depends on` takes all). `Area` split on `,` and trimmed, `—`/`-`/empty → `[]`. `Pts` integer or `null`. CLI runs only when `import.meta.url` equals the invoked file URL.

- [ ] **Step 4: Run tests, expect pass**

Run: `node --test .claude/skills/implement-bunch-ticket/scripts/`
Expected: all parse-wave tests pass.

- [ ] **Step 5: Check against the real plan**

Run: `node .claude/skills/implement-bunch-ticket/scripts/parse-wave.mjs docs/plans/mvp-wave-plan.md "Wave 1"`
Expected: JSON with keys `SCRUM-46, SCRUM-47, SCRUM-48, SCRUM-49, SCRUM-50, SCRUM-51`; SCRUM-51 `dependsOn` `["SCRUM-41","SCRUM-29"]`.

- [ ] **Step 6: Commit**

```bash
git add .claude/skills/implement-bunch-ticket/scripts/parse-wave.mjs .claude/skills/implement-bunch-ticket/scripts/parse-wave.test.mjs
git commit -m "chore: add wave-plan parser for implement-bunch-ticket"
```

### Task 2: Balanced assignee picker

**Files:**
- Create: `.claude/skills/implement-bunch-ticket/scripts/assign.mjs`
- Test: `.claude/skills/implement-bunch-ticket/scripts/assign.test.mjs`

**Interfaces:**
- Produces: `export function assignBalanced(keys: string[], people: { accountId: string, displayName: string }[], rng: () => number = Math.random): { key: string, accountId: string, displayName: string }[]` — one entry per key, in key order. Throws `Error('no people to assign')` when `people` is empty.
- CLI: `node assign.mjs '<keys JSON array>' '<people JSON array>'` prints the result JSON; exit 1 with message on error.

- [ ] **Step 1: Write the failing tests** in `assign.test.mjs`:
  - `every key assigned once`: 6 keys, 4 people → result length 6, keys in input order.
  - `balanced`: 6 keys, 4 people → per-person counts are `{2,2,1,1}` in some order (max − min ≤ 1).
  - `fewer keys than people`: 2 keys, 5 people → two different accountIds.
  - `single person`: 3 keys, 1 person → all three to that person.
  - `deterministic with seeded rng`: same `rng` sequence (e.g. a stub cycling `[0.1, 0.7, 0.3, 0.9]`) → identical results on two calls.
  - `not always first person`: with rng stub returning `0.99` repeatedly, `result[0].accountId` is not `people[0].accountId` (shuffle actually happens).
  - `empty people throws`: throws `/no people to assign/`.

- [ ] **Step 2: Run tests, expect failure**

Run: `node --test .claude/skills/implement-bunch-ticket/scripts/`
Expected: assign tests FAIL (module missing); parse-wave tests still pass.

- [ ] **Step 3: Implement `assignBalanced` and the CLI in `assign.mjs`**

Copy `people`, Fisher–Yates shuffle with `rng`, then key `i` gets `shuffled[i % shuffled.length]`.

- [ ] **Step 4: Run tests, expect pass**

Run: `node --test .claude/skills/implement-bunch-ticket/scripts/`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/implement-bunch-ticket/scripts/assign.mjs .claude/skills/implement-bunch-ticket/scripts/assign.test.mjs
git commit -m "chore: add balanced assignee picker for implement-bunch-ticket"
```

### Task 3: Wave plan and PR templates

**Files:**
- Create: `.claude/skills/implement-bunch-ticket/wave-plan-template.md`
- Create: `.claude/skills/implement-bunch-ticket/pr-template.md`

**Interfaces:**
- Produces: the section names SKILL.md (Task 4) refers to.
  - Wave plan sections, in order: `# Wave <n> — <title>`, `Plan approved by: <name> at <commit sha> (<date>)` line (filled after approval), `## Tickets` (table `Key | Title | Label | Areas | Depends on | Assignee`), `## Clarifications` (table `# | Ticket | Question | Answer | Source`), `## Cross-ticket changes` (shared files, combined migration, build order), `## Constitution Check` (Principles I–VI, pass or justified exception), then one `## SCRUM-n — <title>` section per ticket with `### User story`, `### Acceptance criteria` (`AC1…`), `### Files` (create/modify), `### Test cases` (table `ID | Type (unit/integration/e2e) | File::test name | Proves`), every AC mapped to ≥1 test.
  - PR body sections: `## Tickets` (table `Key | Title | Jira link | Delivered`), `## Plan` (link to `specs/wave-<n>-<slug>/plan.md`), `## Gate evidence (head <sha>)` (same table as `implement-ticket/pr-template.md`, coverage row may say `not available: <reason>`), `## Agent review` (round count, verdict, findings table `# | Severity | File:line | Finding | Disposition`), `## e2e` (spec files and pass counts), `## Acceptance criteria` (table `Ticket | AC | Implemented in | Proven by`), `## Merge note` ("Merge with a merge commit, not squash, so per-ticket commits reach main."; replaced by "Squash-merge required: contains a checkpoint commit." on the halt path), `## Rule exception` (one line: delivered under `implement-bunch-ticket` exception, constitution "Wave delivery").

- [ ] **Step 1: Write both templates** with the sections above, placeholders in `<angle brackets>`, no prose beyond one line per section saying what goes there.

- [ ] **Step 2: Format check**

Run: `pnpm exec prettier --check .claude/skills/implement-bunch-ticket/*.md`
Expected: all files pass (run `--write` first if not).

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/implement-bunch-ticket/wave-plan-template.md .claude/skills/implement-bunch-ticket/pr-template.md
git commit -m "chore: add wave plan and PR templates for implement-bunch-ticket"
```

### Task 4: SKILL.md

**Files:**
- Create: `.claude/skills/implement-bunch-ticket/SKILL.md`

**Interfaces:**
- Consumes: Task 1 CLI, Task 2 CLI, Task 3 section names; `implement-ticket/SKILL.md` for gate commands, code-review checklists and e2e conventions (reference, do not copy).
- Produces: skill name `implement-bunch-ticket`, invoked as `implement-bunch-ticket <wave-plan.md> "<Wave n>"`.

- [ ] **Step 1: Write the frontmatter**

`name: implement-bunch-ticket`; `description:` one paragraph — "Use when a person asks to implement a whole wave of Jira SCRUM tickets from a wave-plan markdown (e.g. docs/plans/mvp-wave-plan.md "Wave 1"). Analyses all tickets of the wave together, asks one round of clarifications, writes one minimal Spec Kit plan with test cases, waits for the user's approval, moves the tickets in Jira (active sprint, balanced random assignees, In Progress, exception comment), implements them with TDD on one branch, runs the gates, Playwright e2e and an independent agent review, then pushes one PR and moves the tickets to In Review. Do not use for a single ticket (implement-ticket), for scoping (create-implementation-item), or to review someone else's PR (review-implementation)."

- [ ] **Step 2: Write the body** with these sections (content from the spec's Flow, one todo per step for the agent):
  - **Overview** — what one run delivers; core principle "nothing is written (Jira, branch, code) before the user approves the wave plan"; read-first list: `AGENTS.md`, constitution "Wave delivery" bullet, `implement-ticket/SKILL.md` (gates, code review, e2e conventions).
  - **Step 1 Load and check readiness** — refuse a dirty tracked tree (`git status --porcelain --untracked-files=no` non-empty → stop); `git fetch -q origin`; run `node .claude/skills/implement-bunch-ticket/scripts/parse-wave.mjs <file> "<wave>"`; wave number 0 → stop ("Wave 0 is in-flight work, use implement-ticket"); `getJiraIssue` for every key; dependency merged = `git log origin/main --oneline | grep -q "<KEY>"` or Jira status category Done; unmet → list and ask whether to run the rest of the wave or stop.
  - **Step 2 Analyse together** — per ticket: current code, areas, gaps vs. AC; across tickets: shared files, one combined Prisma migration if several tickets change `schema.prisma`, build order (any `maintenance` tooling ticket such as SCRUM-46 first).
  - **Step 3 Clarify once** — one message, questions grouped by ticket, each with a recommended default; questions answered by code/docs are stated with source, not asked; "nothing to clarify" is said explicitly.
  - **Step 4 Write the plan** — `specs/wave-<n>-<slug>/plan.md` from `wave-plan-template.md`; slug from the wave title (lowercase, hyphenated); the Tickets table's Assignee column is filled from Step 5's dry-run so the user approves assignments too.
  - **Step 5 Approval gate (⛔)** — before asking: collect the team pool = distinct `assignee` and `reporter` accountIds of `project = SCRUM` issues (`searchJiraIssuesUsingJql`, fields `assignee,reporter`), run `assign.mjs` with the wave's keys, find the active sprint (`searchJiraIssuesUsingJql` `project = SCRUM AND sprint in openSprints()`, field `customfield_10020`, entry with `state: "active"`). Show: plan path, ticket table with assignees, sprint name, the Jira writes that will follow. Wait for an explicit yes. Changes → revise, re-show. Record `Plan approved by` in the plan.
  - **Step 6 Jira moves (before code)** — per ticket: `editJiraIssue` `{ "customfield_10020": <sprintId>, "assignee": { "accountId": … } }`; `getTransitionsForJiraIssue` → `transitionJiraIssue` to the transition whose target status is "In Progress"; `addCommentToJiraIssue` with the exception text ("Delivered under the implement-bunch-ticket rule exception (wave delivery: one branch/PR, minimal plan, agent Jira moves, agent review). Wave <n>: <title>. Plan: specs/wave-<n>-<slug>/plan.md on branch feat/wave-<n>-<slug>."). Read back status and assignee; print the assignment table. These writes need no further preview (covered by Step 5).
  - **Step 7 Implement** — `git switch -c feat/wave-<n>-<slug> origin/main`; commit the plan first (`docs: wave <n> plan`); ticket by ticket in plan order: failing tests from the plan's Test cases → code → tests green → commit(s) `<type>(<scope>): SCRUM-n <summary>`; e2e specs at `apps/web/e2e/scrum-<n>-<slug>.spec.ts` with `AC<k>:` test titles (same conventions as implement-ticket Phase 5); follow `docs/Backend-Conventions.md`, `docs/Frontend-Conventions.md`.
  - **Step 8 Gates, e2e, agent review** — `pnpm typecheck`, `pnpm lint`, `pnpm test`; for `feature` tickets `pnpm test:coverage && pnpm coverage:changed` when both scripts exist, else record `not available: <missing script>`; e2e when the diff touches `apps/web` and `apps/web/package.json` has `test:e2e`: first `pnpm db:up`, `pnpm db:migrate`, `pnpm --filter @launchly/api db:seed` (no Docker → stop and report), then `pnpm --filter @launchly/web test:e2e`; agent review = dispatch a fresh `general-purpose` subagent that did not write the code, with: the diff `git diff origin/main...HEAD`, the plan path, the Jira keys, the checklists (code-review skill at high effort, `vercel-react-best-practices` + Frontend-Conventions for `apps/web`, Backend-Conventions for `apps/api`, constitution Principle I for `packages/shared`), and the instruction to return a findings table with severities and a verdict `APPROVED`/`REJECTED` plus, per ticket, whether every AC is proven by a passing test. Any failing gate, failing e2e, or Critical/Important finding → back to Step 7; round counter max 3; 4th round → push a checkpoint commit `chore(<scope>): SCRUM-<n> checkpoint before halt` if needed, open the PR as Draft, tickets stay In Progress, report.
  - **Step 9 Ship** — `git push -u origin feat/wave-<n>-<slug>`; `gh pr create --base main --title "[SCRUM-a, SCRUM-b, …] Wave <n>: <outcome>" --body-file <filled pr-template.md>`; transition each ticket to In Review; read back.
  - **Step 10 Stop and report** — PR URL, gate table for head SHA, review rounds and verdict, ticket → assignee → status table; "A person merges (merge commit) and moves tickets to Done."
  - **Red Flags: STOP** table — at least: "I'll write code while waiting for approval" → nothing before Step 5 yes; "This ticket has no test, the others cover it" → every AC maps to a passing test; "Coverage script missing so the gate passed" → record `not available`, never `pass`; "I'll assign them all to the user" → use `assign.mjs`; "I'll review my own diff" → fresh subagent only; "One more round" → 3 rounds then Draft; "Ticket outside the wave also needs a change" → stop and ask; "I'll merge / move to Done" → people do that; "Wave 0" → refuse.

- [ ] **Step 3: Check length and format**

Run: `wc -l .claude/skills/implement-bunch-ticket/SKILL.md && pnpm exec prettier --check .claude/skills/implement-bunch-ticket/SKILL.md`
Expected: ≤ 300 lines; prettier passes.

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/implement-bunch-ticket/SKILL.md
git commit -m "chore: add implement-bunch-ticket skill"
```

### Task 5: Rule exception in AGENTS.md and constitution

**Files:**
- Modify: `AGENTS.md` (Flow block after line 61, skills table rows 65–70, the "Agents never … transition tickets" paragraph at line 63)
- Modify: `.specify/memory/constitution.md` (Sync Impact Report header; Development Workflow bullets "Tracking", "Spec-driven features", "Review", "Human ownership", "Remote writes"; version footer)

**Interfaces:**
- Produces: constitution bullet named **Wave delivery** that `SKILL.md` and the PR template cite.

- [ ] **Step 1: Constitution** — add bullet **Wave delivery** after "Delivery labels": "Tickets listed in one wave of a wave plan (`docs/plans/*.md`) MAY be delivered together by the `implement-bunch-ticket` skill. For those tickets: one branch `feat/wave-<n>-<slug>` and one PR may carry several Jira keys (commits stay per key); one wave plan at `specs/wave-<n>-<slug>/plan.md`, approved by the person who ran the skill, replaces the full Spec Kit chain; the agent may add the tickets to the active sprint, set balanced assignees, transition them To Do → In Progress → In Review, and comment on them without further previews; the gates run as in Local gates, except that a missing coverage command is recorded as not available; an independent review by a fresh agent that did not write the code, plus green gates and e2e, satisfies Review. Each ticket gets a Jira comment stating it was delivered under this exception. The rules are defined by the team and need no separate approval." Add one sentence to "Human ownership", "Review" and "Remote writes": "Exception: Wave delivery." Bump `**Version**` to `2.1.0`, `Last Amended` to `2026-11-12`, and prepend a Sync Impact Report entry (2.0.0 → 2.1.0, MINOR, added Wave delivery bullet, AGENTS.md updated).

- [ ] **Step 2: AGENTS.md** — skills table: new row `implement-bunch-ticket` | "Alternative to stage 2 for a whole wave from a wave plan (`docs/plans/mvp-wave-plan.md`): one round of clarifications, one approved wave plan, Jira moves by the agent, TDD on one branch, gates + e2e + fresh-agent review, one PR. Constitution: Wave delivery." Under the Flow block add one line: "`2b. Deliver a wave  implement-bunch-ticket <plan.md> \"Wave n\"  ⛔ approve wave plan → Jira moves → build → agent review → PR → ⛔ person merges`". In the "Agents never merge…" paragraph append: "Exception: `implement-bunch-ticket` (constitution: Wave delivery)."

- [ ] **Step 3: Format check**

Run: `pnpm exec prettier --check AGENTS.md .specify/memory/constitution.md`
Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md .specify/memory/constitution.md
git commit -m "docs: add wave delivery exception for implement-bunch-ticket"
```

### Task 6: Verify and push

- [ ] **Step 1: All script tests**

Run: `node --test .claude/skills/implement-bunch-ticket/scripts/`
Expected: all pass.

- [ ] **Step 2: Repo gates still green**

Run: `pnpm lint && pnpm typecheck`
Expected: exit 0 (scripts live under `.claude/`; if eslint picks them up and fails on globals, add `.claude/**` to the eslint ignore list in `eslint.config.mjs` in this task).

- [ ] **Step 3: Dry read of Wave 1**

Run: `node .claude/skills/implement-bunch-ticket/scripts/parse-wave.mjs docs/plans/mvp-wave-plan.md "Wave 1"` and `... "Wave 0"` handled by SKILL.md (parser returns number 0).
Expected: six tickets for Wave 1; Wave 0 JSON has `number: 0`.

- [ ] **Step 4: Push**

```bash
git push origin chore/agentic-workflow-v2
```
Expected: branch updated on origin.
