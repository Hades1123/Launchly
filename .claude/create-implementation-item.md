# Project config: create-implementation-item and implement-ticket

Read by `.claude/skills/create-implementation-item` and `.claude/skills/implement-ticket`. Keep it current; both skills ask once for anything missing and offer to save the answer here.

## Tracker

- **Tool:** Jira Cloud (Atlassian MCP)
- **Base URL / workspace:** https://hcmut-team-vmaq1hvy.atlassian.net (cloud ID `bec02efe-55db-40ac-a5fc-4b23fd1c1674`)
- **Where new parent items go:** project `SCRUM`, issue type `Story`
- **Status for a new parent item:** To Do
- **Fields to set on create:** `labels` = exactly one delivery label: `feature`, `bug`, or `maintenance`
- **Clarification sub-item name:** Requirements Clarification
- **Title convention:** none for the Story; Subtasks use `<area>: <title>`

## People (roles)

Leave a cell empty when unknown; the skills ask and offer to save it. `implement-ticket` uses the GitHub login and Jira accountId to assign reviewers.

| Role            | Name | Jira accountId | GitHub login | Owns                                                      |
| --------------- | ---- | -------------- | ------------ | --------------------------------------------------------- |
| Business owner  |      |                |              | behavior, roles, wording, rules, priorities               |
| Technical owner |      |                |              | infra, environment config, data scripts, external systems |
| Reviewer        |      |                |              | PR review (add one row per teammate who reviews)          |

## Components

One repo (pnpm monorepo); a component is an area of it. One Subtask per touched area.

| Component | Kind              | Repo                      | Local path        | Allowed branches | Worktree branch |
| --------- | ----------------- | ------------------------- | ----------------- | ---------------- | --------------- |
| `api`     | backend           | github:Hades1123/Launchly | `apps/api`        | main             | main            |
| `web`     | frontend          | github:Hades1123/Launchly | `apps/web`        | main             | main            |
| `shared`  | library (Zod)     | github:Hades1123/Launchly | `packages/shared` | main             | main            |
| `db`      | Prisma migrations | github:Hades1123/Launchly | `apps/api/prisma` | main             | main            |

**Implementation items live in:** tracker sub-items under the parent (Jira `Subtask` under the `Story`).

## Tests (per component)

| Component | Unit / integration                                                 | E2E                                               | Where E2E cases live |
| --------- | ------------------------------------------------------------------ | ------------------------------------------------- | -------------------- |
| `api`     | Vitest + supertest (`*.test.ts`, DB tests behind `RUN_DB_TESTS=1`) | none (supertest endpoint tests)                   | n/a                  |
| `web`     | Vitest                                                             | Playwright (`pn --filter @launchly/web test:e2e`) | `apps/web/e2e/`      |
| `shared`  | Vitest                                                             | none                                              | n/a                  |

Coverage gate for `feature` Stories: `pn test:coverage && pn coverage:changed` (≥80 % lines and branches per changed source file).

## Knowledge

- **Code index:** CodeGraph only if a `.codegraph/` directory exists at the repo root (indexing is the user's decision; never run `codegraph init` unasked). Then query with `codegraph_explore` (MCP) or `codegraph explore "<query>"`. Otherwise use Grep and Read.
- **Knowledge sources, in search order:** `docs/` (architecture, conventions), `specs/*/spec.md`, `.specify/memory/constitution.md`, Confluence on the same Atlassian site.
- **Glossary rule:** roles are `CANDIDATE`, `RECRUITER`, `ADMIN`; use the names in `docs/Launchly-Tech-Stack-Architecture-v1.md`.
- **Knowledge-capture step after decisions:** none.
- **Copy / i18n (frontend):** none (English strings inline).
