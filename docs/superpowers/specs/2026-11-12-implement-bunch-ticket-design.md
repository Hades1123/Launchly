# Design: `implement-bunch-ticket` skill

Date: 2026-11-12 · Status: draft for approval

## Intent

The team has 30 dev-hours in total and 1-hour sprints. Running the full single-ticket flow (full Spec Kit chain, separate review session, per-ticket branch and PR) for each of the 17 MVP tickets costs more time than the tickets themselves. `implement-bunch-ticket` delivers **one wave of tickets at a time**: one analysis, one round of questions, one plan the user approves, one build, one agent review with e2e, one branch and one PR.

## Input

A markdown wave plan plus the wave to run, e.g. `implement-bunch-ticket docs/plans/mvp-wave-plan.md "Wave 1"`.

The plan file is `docs/plans/mvp-wave-plan.md`: one `## Wave <n> — <title>` section per wave, each with a table `Key | Ticket | Area | Label | Pts | Depends on`. The skill reads the wave's table, then fetches every ticket from Jira (description, acceptance criteria, dependencies). Jira is the source of truth for ticket content; the markdown file only supplies grouping, order and dependencies. Wave 0 is in-flight work delivered by the normal flow; the skill refuses to run it.

## Flow

1. **Load and check readiness.**
   - Resolve the wave's tickets; read each from Jira.
   - Every dependency named in a ticket (`## Dependencies`, e.g. SCRUM-41 for SCRUM-51) must be merged into `main`. Unmet dependency → list them and stop for that ticket; the user decides whether to run the rest of the wave or wait.
   - Read code from an up-to-date `main` (fetch first; never modify the user's checkout state beyond creating the wave branch later).
2. **Analyse the wave together.** For each ticket: what exists in the code, what changes, which areas (`api`, `web`, `shared`, `db`). Across tickets: shared files, schema/migration collisions (two tickets adding a Prisma migration → one combined migration), ordering inside the wave.
3. **Clarify in one round.** Collect every open question across the wave (gaps between ticket text and code, contradictions, missing decisions). Ask them in one message, grouped by ticket, each with a recommended default. Questions the code or docs already answer are not asked; the answer is stated with its source. If nothing is open, say so and continue.
4. **Write the wave spec + plan (minimal Spec Kit).** One document at `specs/wave-<n>-<slug>/plan.md` replacing specify → clarify → checklist → plan → tasks → analyze:
   - per ticket: user story, acceptance criteria (from Jira, refined by the clarification answers), files to touch, **test cases** (unit/integration with Vitest + supertest, e2e with Playwright for web changes), each test mapped to the AC it proves;
   - wave-level: build order, shared changes, migration plan, Constitution Check (principles I–VI) with any exception justified;
   - the clarification Q&A, recorded.
5. **⛔ User approves the plan.** The person who invoked the skill must approve the plan before anything else happens. Changes requested → revise and ask again. No Jira writes, branch or code before approval.
6. **Move tickets in Jira (before any code).** For every ticket in the wave:
   - add to the active sprint (today: SCRUM Sprint 3);
   - assign a team member: random, balanced across all assignable members of project `SCRUM` so nobody gets everything;
   - transition to **In Progress**;
   - post a comment: delivered under the `implement-bunch-ticket` rule exception, wave name, link to the approved plan.
   Show the assignment table in chat after it is done.
7. **Implement.** Create branch `feat/wave-<n>-<slug>` from `main`. Ticket by ticket in the planned order: write the failing tests from the plan, then the code (TDD). One or more commits per ticket, each in the existing format `<type>(<scope>): SCRUM-n <summary>` so the Jira–GitHub link stays per ticket.
8. **Agent review and e2e.**
   - Gates: `pn typecheck`, `pn lint`, `pn test`, changed-file coverage ≥80 % for `feature` tickets.
   - Run the Playwright e2e files written for the wave (`pn --filter @launchly/web test:e2e`).
   - Code review of the whole wave diff against each ticket's acceptance criteria and the constitution, done by a **fresh subagent** that did not write the code (keeps the constitution's "independent review" intent).
   - Failures or findings → back to step 7. Maximum 3 rounds; still failing → push a Draft PR with a checkpoint commit (existing Checkpoint exemption) and report what is left.
9. **Ship.** Push the branch; open one PR titled `[SCRUM-a, SCRUM-b, …] Wave <n>: <outcome>` with: ticket list and links, what each ticket delivered, test evidence (gate output, e2e results, review verdict). Transition every ticket to **In Review**.
10. **Stop.** A person merges the PR and moves tickets to Done. The skill never merges or pushes to `main`.

## Rule changes (required before first use)

**Decided by the user:** the team defines these rules itself. No formal amendment process (no separate PR, no second-teammate approval). The skill's PR adds the exception text to `AGENTS.md` and `.specify/memory/constitution.md` directly, and the skill **posts a Jira comment on every ticket of the wave** saying it is delivered under the `implement-bunch-ticket` exception (one branch/PR, minimal plan, agent transitions and agent review), with a link to the plan.

**Built on:** branch `chore/SCRUM-TBD-agentic-workflow-v2` (it holds the newer workflow and `implement-ticket`), not `main`.

The exception covers:

- one branch and one PR may carry several Jira keys (branch `feat/wave-<n>-<slug>`, PR title lists all keys); commits stay per key;
- the minimal Spec Kit plan (step 4) plus user approval satisfies "spec-driven features" for tickets run by this skill;
- the agent may transition the wave's tickets (To Do → In Progress → In Review), add them to the active sprint, and set assignees;
- the agent review in step 8 (fresh subagent + gates + e2e) satisfies the "independent review" requirement for PRs opened by this skill.

Everything else stays: people merge, agents never push to `main`, gates must pass before push.

## Goals

- One wave delivered per run, with one approval gate.
- Every ticket still traceable: own commits, own AC → test mapping, own Jira status.
- Tests (including e2e) written and run for every ticket.

## Non-goals

- Replacing the single-ticket flow for normal work outside the MVP waves.
- Creating or rewriting Jira tickets (scoping stays with `create-implementation-issue`).
- Merging, moving tickets to Done, or deploying.

## Anti-goals (failure even if it "works")

- Code written before the user approved the plan.
- A wave PR where one ticket silently has no tests or no AC coverage.
- Pushing to `main`, merging, or touching tickets outside the wave.
- Assigning every ticket to the same person.

## Decisions made by me (check these)

- Sprint = **the active sprint**, not hard-coded "Sprint 3" (Sprint 3 today).
- Assignee pool = all active assignable users of project `SCRUM`, balanced round-robin over a shuffled list.
- Branch type `feat` for a wave; Jira keys only in commits and PR title.
- Review by a fresh subagent to keep the constitution's independence rule meaningful.
- 3 fix rounds, then Draft PR + report.
- Tickets with unmet dependencies are skipped only with the user's OK, never silently.
- Location: `.claude/skills/implement-bunch-ticket/SKILL.md`, plus short reference files if the SKILL.md grows past ~300 lines.
- **"Feature" ticket** = Jira label `feature` (all MVP Stories carry it; SCRUM-46 is `maintenance`).
- **Missing tooling:** e2e and coverage gates apply only once the tooling exists on the wave branch. In Wave 1, SCRUM-46 (Playwright) is built first inside the wave, then the e2e gate applies to the other web tickets of that wave. If no coverage tool exists, the coverage gate is reported as "not available" in the PR, not silently passed; the skill does not add dependencies outside a ticket's scope.
- **Environment:** local Claude Code only (needs Docker and the Atlassian MCP). Before e2e the skill runs `pn db:up`, `pn db:migrate` and the idempotent seed against the local dev database, then lets the Playwright config start the servers. No Docker → stop at step 8 and report.
- **Working copy:** the user's checkout. Refuse to start if tracked files have uncommitted changes (untracked files are fine), then create the wave branch from fresh `origin/main`.
- **"Merged" check for dependencies:** the key appears in `git log origin/main`; Jira status Done is accepted as a fallback.
- **Merge style:** the PR body asks for a merge commit (not squash) so per-ticket commits reach `main`; on the checkpoint path squash is required and per-ticket traceability falls back to the PR body.
- **After a halt (Draft PR):** tickets stay In Progress; only a clean, ready PR moves them to In Review.

## Left to the builder

- Exact wording and structure of the SKILL.md, the plan template, and the PR body template.
- How to parse the wave table robustly (and a clear error if the format is wrong).
- Jira transition IDs and sprint lookup (discover at run time via the Atlassian MCP).
- Whether to reuse helpers from existing `speckit-*` scripts for creating the `specs/` directory.
