# Wave <n> — <title>

Plan approved by: <name> at <commit sha> (<YYYY-MM-DD>)

Wave plan source: `<docs/plans/....md>` · Branch: `feat/wave-<n>-<slug>` · Sprint: `<active sprint name>`

## Tickets

<One row per ticket of the wave, in build order. Assignee comes from assign.mjs.>

| Key     | Title   | Label                  | Areas                  | Depends on  | Assignee |
| ------- | ------- | ---------------------- | ---------------------- | ----------- | -------- |
| SCRUM-n | <title> | <feature/maintenance…> | <api, web, shared, db> | <keys or —> | <name>   |

## Clarifications

<Every question raised in step 3 and its answer. "None" if nothing was open.>

| #   | Ticket  | Question   | Answer   | Source                           |
| --- | ------- | ---------- | -------- | -------------------------------- |
| Q1  | SCRUM-n | <question> | <answer> | <user / code path / doc section> |

## Cross-ticket changes

<Shared files touched by more than one ticket, the single combined Prisma migration (if any), and the build order with the reason for it.>

## Constitution Check

<One line per principle: pass, or the justified exception.>

- I. Shared Contracts First: <pass / exception>
- II. Layered Modular Monolith: <…>
- III. Secure by Default: <…>
- IV. Tested Business Logic: <…>
- V. Safe Data Evolution: <…>
- VI. Simplicity and Pinned Dependencies: <…>

## SCRUM-n — <title>

### User story

<From the Jira ticket.>

### Acceptance criteria

<From Jira, refined by the clarification answers.>

- AC1: <…>
- AC2: <…>

### Files

- Create: `<path>`
- Modify: `<path>`

### Test cases

<Every AC is proven by at least one test.>

| ID  | Type                     | File::test name       | Proves |
| --- | ------------------------ | --------------------- | ------ |
| T1  | unit / integration / e2e | `<path>::<test name>` | AC1    |
