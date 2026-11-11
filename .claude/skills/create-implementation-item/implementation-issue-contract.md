# Implementation Subtask contract (one per area)

Developer work lives in one Jira `Subtask` per affected area of the monorepo (`api`, `web`, `shared`, `db`; config, "Components"), created under the parent Story. `implement-ticket` delivers all Subtasks of a Story on one branch and one PR, and reads the `## Technical Acceptance Criteria` (T-ids) and `## Edge Cases` (E-ids) sections by heading, so keep those headings exact.

## Research sources

- **Code claims** (Architecture, Files to Change, Verified Against Codebase) cite code read from the step 1 code source: an allowed branch, or its read-only worktree. Use the code index if the config names one.
- **Business terms** come from the config's knowledge sources.
- A claim found in none of them goes under Open Questions, never asserted.

## Shared header (every component)

1. **Title:** `<area>: <plain imperative title>`, e.g. `api: add job duplicate endpoint`. No ticket id in the title.
2. **First body line:** the parent and sibling links:
   ```
   **Parent:** [<SCRUM-n> <parent title>](<parent url>) · **Related:** SCRUM-<n>, SCRUM-<n>
   ```
   List every sibling issue. Write `TBD` until a sibling exists; leave it out if there are none.
3. **Label:** none on the Subtask; the delivery label (`feature`, `bug`, `maintenance`) lives on the parent Story.

## Shared sections (every component)

Each contract below places these by name:

- **`## Context`**: 2 to 4 sentences: what changes and why, from the parent's point of view, plus today's facts with numbers where they exist (counts, sizes, timings, error rates).
- **`## Decisions`**: one bullet per technical decision, numbered, each with who made it and when. The last bullet is what was rejected and why:
  ```
  - D1: <decision, concrete: command, flag, path, value> (<name>, <date>)
  - Rejected: <alternative> (<reason>)
  ```
  A decision the user didn't confirm ends with `(assumed, to confirm)`.
- **`## Edge Cases`**: one bullet per case, `- E1: <situation> → <expected result>`. Test rows and scenarios point to these ids.
- **`## Todo`**: ordered checkboxes, each tagged with the criteria it satisfies: `- [ ] <step> (T2, T3)`.
- **`## Technical Acceptance Criteria`**: one checkbox per check, `- [ ] T1: <measurable check>`, ticked when verified, up to about 8, each naming how it's checked. Add a security or permissions line when the work touches auth, roles, CI or secrets.
- **`## Out of Scope`**: technical boundaries for this issue. Business scope stays in the parent.
- **`## Open Questions`**: technical points code and docs can't settle, or "None". "Where is X in the code" is never one: look it up.
  ```
  - Q1: <question> (Owner: technical owner | implementer)
    - Today: <what we checked and saw>
    - Why it matters: <the T-id or decision it blocks>
    - A: <option>: <trade-off>
    - B: <option>: <trade-off>
    - Suggested: <A, B, or an order>
  ```
  Business questions belong in the parent.
- **`## Verified Against Codebase`**: branch, commit SHA and date the facts were read from, then one bullet per claim: `- <claim>: <path>:<line>`.

## Backend (service / API) contract

1. **`## Context`** (shared)
2. **`## Flow: Current`**: one ` ```mermaid ` `flowchart` through services, endpoints and data stores. A brand-new flow writes "No current flow."
3. **`## Flow: New`**: one ` ```mermaid ` `flowchart` after the change, changed nodes marked (e.g. `:::changed` with a `classDef`).
4. **`## Architecture`**: an endpoints table, then data model changes (tables, columns, defaults) or "None":
   ```
   | Method | Path | Handler | New / Changed / Removed | Contract delta |
   ```
5. **`## Decisions`** (shared)
6. **`## Edge Cases`** (shared)
7. **`## Deployment & Data`**: what the technical owner's team must run or provide per environment: migrations, data scripts, environment variables, scheduled jobs, config. "None" if nothing.
8. **`## Test Cases`**: the E2E/API cases in the project's suite (config, "Tests"):
   ```
   | Case | Edge case / T-id | Location | Setup | Expected |
   ```
   Cover the happy path, an auth failure, a validation failure, and every Edge Case. Add unit/integration rows when the config names a framework.
9. **`## Todo`** (shared)
10. **`## Technical Acceptance Criteria`** (shared)
11. **`## Out of Scope`** (shared)
12. **`## Files to Change`**: a fenced block of paths with `← what changes` annotations.
13. **`## Open Questions`** (shared)
14. **`## Verified Against Codebase`** (shared)

## Frontend (UI) contract

Same order and section names as the backend contract. Only the content of Flow, Architecture, the deployment slot and Test Cases is UI-specific.

1. **`## Context`** (shared)
2. **`## Flow: Current`**: one ` ```mermaid ` `flowchart` of today's user flow through screens, components and API calls. A brand-new flow writes "No current flow."
3. **`## Flow: New`**: one ` ```mermaid ` `flowchart` after the change, changed steps marked. If the flow doesn't change, write "No flow change" in both.
4. **`## Architecture`**:
   - **API changes**, or "None": `| Endpoint | Change (new / changed contract / removed) | Consumed in (service / hook / store) |`
   - **Affected pages:** `| Route / page | Component | Change |`
   - Then state changes (stores, contexts, cache keys, local storage), or "None".
5. **`## Decisions`** (shared)
6. **`## Edge Cases`** (shared)
7. **`## Copy & Translations`**: new or changed user-facing strings, in the config's i18n key format with their source-language text. "None" if none.
8. **`## Test Cases`**:
   - **Unit** (framework from config): `| Test file | Case | Edge case / T-id | New / Refined |`
   - **E2E**: cases for the config's E2E tool, or, if there is none, `Given / When / Then` scenarios tagged with E-ids, run by hand on a test environment and reused for acceptance testing.
9. **`## Todo`** (shared)
10. **`## Technical Acceptance Criteria`** (shared)
11. **`## Out of Scope`** (shared)
12. **`## Files to Change`**: a fenced path block with `←` annotations.
13. **`## Open Questions`** (shared)
14. **`## Verified Against Codebase`** (shared)

## Other components (worker, mobile, infra, library)

`## Context`, `## Change` (the interface or behavior that changes, as a table if there are several), `## Decisions`, `## Edge Cases`, `## Deployment & Data` (if it runs somewhere), `## Tests` (framework from config), `## Todo`, `## Technical Acceptance Criteria`, `## Out of Scope`, `## Files to Change`, `## Open Questions`, `## Verified Against Codebase`.

## Brevity

An issue is a scannable spec, not an essay. Tables, mermaid charts and code carry the load; prose connects them. Each section is the shortest form that meets the contract, each point is written once, and the parent is linked, not restated.

## Common mistakes

- **Wrong content for the component.** Section names match across components, but a backend Architecture holds endpoints and tables and a frontend one holds API usage, pages and state.
- **Missing parent link.** Every issue opens with it.
- **ASCII flow blocks.** Use mermaid.
- **Test rows without cases.** Each row names a concrete case, where it lives, and its expected result. "Add tests" is not a case.
- **Vague code claims** with no file, endpoint or component. List them under Verified Against Codebase.
- **List items as bare lines.** Every list item (D, E, T, Q, Todo, Out of Scope, verified claims) is a markdown bullet.
- **Unlinked ids.** Every Todo item names its T-ids, and every test row names its E- or T-id.
- **Business questions in issues.** They belong in the parent.
- **Local references.** Readers see Jira and GitHub only. Name files by repo path, never by a local absolute path.

## Voice

Applies to Context, Decisions, Edge Cases, Out of Scope and Open Questions prose. Tables, mermaid, paths and `←` annotations are exact technical content and stay as they are.

- Plain and direct, short sentences, active voice. No filler or hype words.
- **No em dashes at all.** No `—`, no `--`, no inline `---`. Check this last.
