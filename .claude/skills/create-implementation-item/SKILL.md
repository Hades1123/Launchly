---
name: create-implementation-item
description: Use when a Jira SCRUM ticket needs a dive into its business context and code impact to judge feasibility or effort, or when a vague feature idea needs a clear intention, a Jira Story and per-area implementation Subtasks. Trigger on "scope this ticket", "is this feasible", "how would we build X", "turn this idea into tickets", "create the implementation issues". Stage 1 of the Launchly workflow; hand the result to implement-ticket. Do not use to implement or review.
---

# Create Implementation Item

## Overview

One workflow from **a Jira ticket link or a vague idea** to **a confirmed intention, a Jira `Story` with exactly one delivery label, and one Jira `Subtask` per affected area** (`api`, `web`, `shared`, `db`). An optional clarification Subtask carries the open questions. This is stage 1 of the workflow in `AGENTS.md`; stage 2 is `implement-ticket`.

Core principle: business logic and code are often unclear, so **every claim in the tickets is verified (knowledge sources, code from `main` or its worktree) or recorded as a clarification question**, and **nothing is written to Jira until the user approves a preview of it**.

**Violating the letter of these steps is violating the spirit.** A user in a hurry gets shorter questions, not skipped phases.

Reference files in this directory (read each when a step points to it):

| File                                                | Holds                                                              |
| --------------------------------------------------- | ------------------------------------------------------------------ |
| `.claude/create-implementation-item.md` (repo root) | Project config: Jira, people, components, tests, knowledge sources |
| `tracker-reference.md`                              | Jira access, MCP tools and operations                              |
| `parent-item-contract.md`                           | Sections of the business-level Story                               |
| `implementation-issue-contract.md`                  | Sections of each per-area Subtask                                  |

## Modes

| Input              | Mode       | Story                                                                                     | Subtasks                        |
| ------------------ | ---------- | ----------------------------------------------------------------------------------------- | ------------------------------- |
| Jira `SCRUM-n` URL | **Ticket** | exists (a `Story`, or a `Task` for older tickets): read it, never rewrite its description | one per affected area, under it |
| Idea in words      | **Idea**   | new, per `parent-item-contract.md`                                                        | one per affected area, under it |

## Delivery label

Every Story ends this skill with exactly one label. It decides the gates `implement-ticket` and `review-implementation` apply (`AGENTS.md`, constitution Principle IV):

| Label         | When                                                            | Spec Kit                                                                              | 80 % changed-file coverage            | Playwright e2e             |
| ------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------- | -------------------------- |
| `feature`     | new or changed behaviour                                        | yes                                                                                   | yes                                   | yes, if `apps/web` changes |
| `bug`         | restores already specified behaviour                            | yes, unless the fix only restores already specified behaviour (Maintenance exemption) | no; a test that fails without the fix | yes, if `apps/web` changes |
| `maintenance` | behaviour-preserving: refactor, deps within pins, tooling, docs | no (cite the constitution's Maintenance exemption)                                    | no                                    | yes, if `apps/web` changes |

Pick it in step 4 and state it in the scoping summary.

## Steps

### 0. Project config and input (before anything else)

Tools are not checked in advance. Each step calls its tools when it needs them, and a failure pauses the run there (see "When a tool is unusable").

**0.1 Input.** Classify what the user gave.

| Input                                                       | Action                                                                                                                                       |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Empty, whitespace, or only the skill name                   | Stop. Ask for a Jira link, or a sentence on what should change.                                                                              |
| Jira URL or `SCRUM-n` key                                   | **Ticket mode.** Step 2 reads the item.                                                                                                      |
| URL of another tool                                         | Say this skill writes to Jira `SCRUM` only; ask whether to scope it as an idea instead.                                                      |
| A bare number                                               | Ask whether it is `SCRUM-<number>`.                                                                                                          |
| Text naming a change and who or what it affects             | **Idea mode.**                                                                                                                               |
| Text with no clear intention ("improve the dashboard")      | Ask one question: what should change, and for whom? Repeat until the answer names a change.                                                  |
| A link plus text                                            | **Ticket mode.** The text steers the step 4 focus.                                                                                           |
| Not a product change (debugging, code review, implementing) | Say this skill doesn't fit, name the better one (`implement-ticket`, `review-implementation`, `superpowers:systematic-debugging`), and stop. |

**0.2 Config.** Load `.claude/create-implementation-item.md` and read `AGENTS.md`. If a needed field is missing (Ticket and Idea mode need the Jira project and components), send **one** message with your best guesses marked and ask the user to correct them, then offer to save them to the config.

Then say the mode and create one todo per step below.

### When a tool is unusable (every step)

A tool is unusable when its call fails: not connected, auth or permission error, item not found, or a timeout on the second try. First try the other routes (`tracker-reference.md`, "Access routes"). If none works:

1. **Pause in place.** Don't skip the step, don't guess its result, don't start a later step, and don't try the next write in step 6.
2. **Tell the user** in one message: the step, the tool, the exact error, and the fix they can apply.
3. **Wait.** On "done" or "retry", repeat the failed call and continue. Never redo calls that already succeeded.
4. **The user may choose instead:**
   - **Skip a source** (a knowledge source, the code index) for the rest of the run. Claims only it could confirm are marked `(unverified)` and become Open Questions.
   - **Skip the Jira writes.** Step 6 is dropped and the drafts stay in chat to paste by hand: a **draft-only** run. In Ticket mode, tell the user to check the Story's Subtasks by hand first, since the duplicate check didn't run.

A user who says up front that a tool won't work has made that choice already: confirm it in one line and carry on. A permission prompt the user denies is their decision, not a failure: ask whether to retry or skip the Jira writes.

### 1. Code baseline (worktree when needed)

Code facts come only from `main`. Run:

- `git branch --show-current`
- `git status --short`
- `git fetch -q origin main`, then `git rev-list --count HEAD..origin/main`

Then pick where to read code from. Prefer reading `origin/main` directly without touching the disk: `git show origin/main:<path>`, `git grep <term> origin/main`, `git ls-tree -r --name-only origin/main <dir>`. Create the worktree below only when a code index must run against `main`, or the read-only commands are not enough.

- **On `main`, clean tree, 0 commits behind:** the checkout itself.
- **Anything else** (feature branch, uncommitted changes, behind): the `origin/main` git commands above, or a detached, read-only worktree. Never switch, stash or reset the user's checkout. Never edit files in the worktree. Keep it for the next run.

  ```bash
  WT=../Launchly-scoping   # outside the repo, so the repo's code index can't resolve to the checkout
  git fetch -q origin main
  if [ -d "$WT" ]; then git -C "$WT" checkout -q --detach origin/main
  else git worktree add -q --detach "$WT" origin/main; fi
  ```

  - Tell the user in one line, e.g. "You're on `feat/SCRUM-41-...` with changes, so I'm reading code from a worktree of `origin/main` at `../Launchly-scoping`."
  - **Code index:** if the config names one (CodeGraph only when `.codegraph/` exists), point every query at `<WT>`. Never build a new index unasked. Without an index, Grep and Read inside `<WT>`.

- **Fetch fails** (offline, auth): tell the user, read the checkout, and mark code findings "(from `<branch>`, not verified against `main`)".
- **If blocked:** `git worktree add` fails (fix: `git worktree prune`, or free the path). Pause.

### 2. Gather the ticket (Ticket mode only)

- Read the Story with its description, comments, Subtasks and links (`tracker-reference.md`, "Reading a ticket"). If it doesn't exist, stop and ask for the right link.
- Existing Subtasks per area and an existing clarification Subtask get **edited** (with approval), never duplicated. When only some areas have one, plan edits for those and creates for the rest.
- Note the delivery label: missing or several means the Gate 1 table carries the label edit.
- **If blocked:** Atlassian MCP missing or erroring (fix: reconnect or re-auth the Atlassian connector). Pause. Skipping doesn't help: the ticket is the input.

### 3. Context sweep (before the first question)

Work through the config's **knowledge sources** in their listed order, then the code, and keep a source for every finding:

1. **Jira:** in both modes, search `SCRUM` for overlapping or prerequisite work (`searchJiraIssuesUsingJql`, `project = SCRUM AND text ~ "<term>"` for each key term, including open Tasks and their Subtasks). Work another ticket already owns is not re-specified: it becomes a dependency (`Depends on: SCRUM-n`). Also read `AGENTS.md` "Prerequisite tooling": a gate whose tooling ticket is not merged is a dependency of every `feature` that needs it.
2. **Docs, specs, Confluence:** search for the ticket key and for every decision, feature and term the input mentions. An existing `specs/<feature>/` that owns the scope is reported: `implement-ticket` will update it instead of creating a parallel one.
3. **Code:** for each affected feature, query the code index, or Grep and Read, in the step 1 code source.

A question the sweep already answered is not asked. State the answer and its source instead.

**If blocked:** a remote doc source fails (fix: network, auth, retry later), or the code index fails (fix: `codegraph sync`, or skip the index and use Grep). Pause. The same applies to code lookups in step 4.

### 4. Validate the intention

The goal is a confirmed intention, not a document. No spec file, no design doc, no plan: Spec Kit runs later, inside `implement-ticket`.

**Questioning rules:**

- One question per message, a single sentence, in the user's vocabulary.
- Follow it with 2-4 short example answers the user can pick, combine or ignore, e.g. "(a) before the run starts, (b) during the run, (c) both". Mark your recommended one. Leave them out only when no realistic set exists.
- On "just guess", propose something concrete. A guess they can correct often beats a question.
- Think through several approaches privately. Show a comparison only when it helps them decide.
- Once you understand a part, play it back with guesses marked, and ask what's wrong or missing.
- In a hurry: fewer, sharper questions. A default said out loud counts, because they can reject it.
- The clarification-list yes/no ask (below) doesn't count as the message's one question.
- On "that's all I know" or "wrap up", send the scoping summary now. Every open point becomes an assumption.

**Ground to cover** (territory, not a script): the business concept and why it matters now; which roles (`CANDIDATE`, `RECRUITER`, `ADMIN`) and features it touches; what changes in each area; feasibility, effort and risks; the delivery label.

**The user can't answer** ("no idea", "ask the PO"):

1. Try to answer it yourself from step 3's sources. If the user routed a code question to the technical owner, answer it from the code and say why you didn't route it.
2. Still open? Ask "Add this to the clarification list?" in the same message as your next question (on its own if none is left).
3. On yes, add it with its owner role, state the assumption you'll continue with, and mark it `(assumed, to confirm)`.
4. On no, the user picks the assumption. It becomes their decision, not a list item.

**Owner rule** (names from config):

- **Business owner:** behavior, roles, wording, rules, priorities.
- **Technical owner:** only what code and docs can't settle: production infrastructure, data scripts, environment config, external systems (Gemini, Google OAuth, S3, SES).

**Stale or ambiguous terms** (a renamed concept, a vague noun like "the report"): pin the meaning down with the user first. Only if they can't does it become a business-owner question.

**Scoping summary (ends step 4).** One message, in order:

1. **Intention:** what changes, for whom, why now (2-3 sentences)
2. **Delivery label:** `feature`, `bug` or `maintenance`, with one line of reason
3. **Decisions:** one line each
4. **Assumptions:** each marked `(assumed, to confirm)`
5. **Impact per area:** one line each with its source (doc, code path). No source: look it up before sending; still none, mark `(unverified)`. Never invent a path.
6. **Feasibility:** a verdict, a size per area (S/M/L), the main risks, and the dependencies from step 3 (`Depends on: SCRUM-n <title>`, including missing gate tooling). Flag when the whole Story looks bigger than one PR of about 300 handwritten lines, and propose a split into several Stories.
7. **Clarification list:** question, owner role, current assumption; or "None"

End with "Is this right?" and loop until the user explicitly confirms. The confirmed summary is the only input to step 5.

### 5. Draft the Story and the Subtasks (inline preview)

Show every draft **inline in chat**, one fenced markdown block per document, fenced with four backticks (` ````markdown `) so inner code and mermaid blocks don't break it. No local files. The latest version in chat is the source for step 6.

1. **Story, only when none exists (Idea mode):** per `parent-item-contract.md`, including the delivery label line. The whole clarification list goes in its Open Questions. Related shows `TBD` for the Subtasks.
2. **Subtasks (both modes):** one per affected area, per `implementation-issue-contract.md`.
   - Each starts with the parent link. In Idea mode it's `TBD` until step 6 creates the Story.
   - An area the summary lists with no work gets no Subtask. Say so in the summary's impact line ("no Subtask"); the user's confirmation of the summary approves dropping it. Never pad.
   - Ticket mode (the Story is not rewritten): technical clarification questions also go in the affected Subtask's Open Questions.

Show the drafts **with the Gate 1 table** (step 6), or in a draft-only run with a manual checklist of what to create by hand (items, labels, links). After a change, re-show only the changed draft plus the table.

**Draft-only run:** the inline drafts are the deliverable.

### 6. Jira writes

- **Gate 1.** One table listing every write:

  | #    | Where           | What                                              | Title              | Details                                                                                 |
  | ---- | --------------- | ------------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------- |
  | 1    | Jira `SCRUM`    | create Story (Idea mode)                          | the approved title | type Story, status To Do, label `<delivery label>`, description = the Story draft above |
  | 1    | `SCRUM-n`       | set label (Ticket mode, only if missing or wrong) | (none)             | labels = [`<delivery label>`]                                                           |
  | 2..n | under the Story | create (or edit `SCRUM-m`) Subtask                | `<area>: <title>`  | description = that area's draft above                                                   |
  | n+1  | the Story       | link to dependencies                              | (none)             | `createIssueLink` type `Blocks`: each `Depends on` ticket blocks this Story             |
  | n+2  | the Story       | link Subtasks                                     | (none)             | Idea: rewrite own Related section. Ticket: the exact comment text                       |
  - Assignees stay empty. Reviewer and assignee are set later by `implement-ticket`.
  - A yes ("yes", "create them", "go") given while the table is on screen passes the gate. "Summary confirmed", or "set up the tickets" said before the table was shown, does not.

- **Execute in this order**, verifying each write by reading it back:
  1. **Story (Idea mode):** create it with its label and description (`tracker-reference.md`). Fill its key and URL into every Subtask draft.
  2. **Subtasks:** create each with `parent` = the Story key, then fill sibling keys and edit them.
  3. **Link back to the Story** (`tracker-reference.md`, "Link Subtasks back").
  - Text changes only for the keys and links this step fills in. Anything else needs a new Gate 1.
- **If blocked** mid-way: list what already exists (with links, and say if a description was pasted by hand rather than read back) and what is still to do, then pause. On resume, continue with the failed write. Never re-create something that exists.
- **Clarification list not empty:** if the config's People table has no Jira accountId for an owner with questions, ask for the name and look it up (`lookupJiraAccountId`) first, and offer to save it. Then ask "Post the N clarification questions to Jira?"
  - On yes: reuse or create the clarification Subtask (name from config). **Gate 2:** preview the comment, plus the Subtask creation if it's new, and wait for a yes. Then post one comment that mentions only the owners who have questions in it, and read it back.
  - On no: post nothing. The questions stay in the drafts' Open Questions; list them in the wrap-up.

### 7. Wrap up

- List every link created and anything that failed or was skipped.
- End with the next step: "Next: a person hands `SCRUM-<n>` to an agent, which runs `implement-ticket SCRUM-<n>`." Open clarification questions that block a decision are named here: `implement-ticket` will stop on them in its Phase 1.

## Red Flags: STOP

| Thought                                                                                | Reality                                                                                             |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| "User's in a hurry, skip validation and write the tickets"                             | Fewer, sharper questions. The summary still needs a confirmation.                                   |
| "The input is vague, step 4 will sort it out"                                          | Step 0 first: one question until the input names a change.                                          |
| "I'll check every tool up front"                                                       | No pre-checks. Each step calls its tools when it needs them.                                        |
| "That tool failed, I'll skip it and carry on" / "I'll fill in what it would have said" | Pause, report the exact error and the fix, and wait. Only the user can choose to skip.              |
| "I'll write a spec / design doc first"                                                 | No spec here. Spec Kit runs in `implement-ticket`. The confirmed summary goes straight into drafts. |
| "Feature branch, I'll read it and flag it" / "I'll switch or stash their branch"       | Use the read-only worktree. Never touch the checkout.                                               |
| "Summary confirmed, they asked for tickets, so create them"                            | Gate 1 needs a yes given while its table is on screen.                                              |
| "The Story exists, I'll tidy its description"                                          | Ticket mode never rewrites the Story. Link the Subtasks with one comment.                           |
| "No label fits exactly, I'll leave it off" / "I'll add two labels"                     | Exactly one delivery label. Ask if unsure.                                                          |
| "I'll assign someone / move it to In Progress"                                         | No assignees, no transitions here. People hand off tickets.                                         |
| "The technical owner would know where this lives in code"                              | The code knows. They get only what we cannot determine.                                             |
| "I'll post the questions now"                                                          | Only after the Story and Subtasks exist, only on yes, only after the Gate 2 preview.                |
