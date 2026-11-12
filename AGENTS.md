# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Codex, etc.) when working with code in this repository.

Launchly is a recruitment platform: a pnpm monorepo with a Next.js frontend (`apps/web`), an Express 5 REST API (`apps/api`) and shared Zod schemas (`packages/shared`), on PostgreSQL via Prisma 7. Architecture rationale is in `docs/Launchly-Tech-Stack-Architecture-v1.md`; setup decisions in `docs/Launchly-Project-Setup-Plan.md`; frontend conventions and design tokens in `docs/Frontend-Conventions.md`. Write all docs in English.

## Commands

Use `pn` (alias of `pnpm`) from the repo root.

```bash
pn db:up                 # start PostgreSQL (Docker, host port 5433)
pn db:migrate            # prisma migrate dev (apply migrations + generate client)
pn dev                   # API :4000 + web :3000 together
pn dev:api / pn dev:web  # run one app (separate terminals, easier debugging)
pn typecheck             # tsc in every package
pn lint                  # eslint . (flat config at root)
pn test                  # vitest in every package (--if-present)
pn --filter @launchly/api test -- path/to/file.test.ts   # single test file
pn --filter @launchly/api exec prisma <cmd>              # any Prisma CLI command
```

Tests are colocated `*.test.ts` (Vitest; API endpoints via supertest on `createApp()`). The seed has tests in `apps/api/prisma/seed/run.test.ts`: guard unit tests run by default, plus an idempotency integration test gated behind `RUN_DB_TESTS=1` (it needs a migrated local database). There is no CI. Prisma command reference: `docs/Prisma-Cheatsheet.md`.

## Architecture

- **Shared package is source-only.** `@launchly/shared` exports `./src/index.ts` directly (no build step). Next.js consumes it via `transpilePackages`; the API runs it through `tsx` in dev and bundles it with `tsup` (`noExternal`) for production. Define request/response shapes as Zod schemas there and export `z.infer` types; the API validates with them and the web app reuses them. Never expose Prisma types to the frontend; map to shared DTOs.
- **Web → API goes through a Next.js rewrite.** `apps/web/next.config.ts` proxies `/api/:path*` to `${API_URL}/:path*` (default `http://localhost:4000`), so the API route `/health` is `/api/health` from the browser. Server components can call `API_URL` directly.
- **API layering** (route → controller → service → Prisma), organised in `apps/api/src/modules/<feature>/`. Cross-cutting code is in `middlewares/` (error handler, validate, not-found) and `lib/` (`env.ts` Zod-validated env that fails fast, `prisma.ts`). `providers/` is reserved for swappable implementations (storage: local/S3, mail: SMTP/SES) selected by `STORAGE_DRIVER` / `MAIL_DRIVER`; business code must depend on the abstraction, not the vendor.
- **Prisma 7 specifics.** Datasource URL lives in `apps/api/prisma.config.ts`, not in `schema.prisma`. The client is generated into `apps/api/src/generated/prisma` (git-ignored; run `db:generate` after cloning) and needs a driver adapter: `PrismaPg` in `lib/prisma.ts`. Import it from `@/generated/prisma/client`.
- **Auth design (not yet implemented):** short-lived JWT access token plus refresh token in an httpOnly cookie; Google OAuth verified on the backend. Roles: `CANDIDATE`, `RECRUITER`, `ADMIN`.

## Conventions and gotchas

- Inside `apps/api` and `apps/web`, import same-app files with the `@/` alias (maps to `src/`), not `../` paths.
- Backend code follows `docs/Backend-Conventions.md`: signal failures by throwing `AppError` and validate input with `validate({ body, params, query })` before the controller; never build error responses with `res.status().json()` — the central `errorHandler` maps `AppError`/`ZodError` to the shared `apiErrorSchema`.
- Frontend UI follows `docs/Frontend-Conventions.md`: style with the semantic tokens from `apps/web/src/app/globals.css` (`bg-primary`, `text-muted-foreground`, `rounded-card`); never raw palette classes (`bg-indigo-600`) or arbitrary values (`bg-[#4f46e5]`).
- Commits follow Conventional Commits with scopes `api`, `web`, `shared`, `db`, `deps` (see `CONTRIBUTING.md`).
- TypeScript is pinned to `~6.0.3` because `typescript-eslint` does not support 7.x. Prisma is pinned to 7.10.1 (npm `latest` is an 8 RC).
- pnpm 12 blocks dependency build scripts; allowed packages are listed under `allowBuilds` in `pnpm-workspace.yaml` (`prisma`, `@prisma/engines`, `esbuild`). Add new ones there if an install reports `ERR_PNPM_IGNORED_BUILDS`.
- Postgres is mapped to host port **5433** (5432 conflicted); `DATABASE_URL` in `apps/api/.env` must match. Env files are created by copying each `.env.example`.
- The API does not migrate on startup. Never edit committed migrations; never run `migrate reset` or `db push` against shared databases.

## Agent skills and delivery workflow

Repository skills live in `.claude/skills/` (Claude Code loads them automatically; other agents read the `SKILL.md` directly). Read a skill's `SKILL.md` before doing the task it covers. The `speckit-*` skills are generated by `specify init` and are refreshed by Spec Kit upgrades, so put project rules in `.specify/memory/constitution.md` instead of editing them. Project settings the workflow skills share (Jira, people, components, tests) live in `.claude/create-implementation-item.md`.

### Flow (⛔ = a person decides)

```
1. Scope    create-implementation-item  idea or SCRUM link → questions → confirmed summary
                                        ⛔ Gate 1: approve the Jira writes → Story (1 label) + Subtasks
            ⛔ a person hands the Story to an agent
2. Deliver  implement-ticket SCRUM-n    Phase 0 resume · 1 verify ticket vs code (⛔ approve ticket edits)
                                        · 2 branch + spec dir · 3 Spec Kit (⛔ approve plan, tick checklists)
                                        · 4 implement + unit gate · 5 Draft PR: code review + e2e (≤3 rounds)
                                        · 6 ready for review · 7 ⛔ choose reviewer → GitHub + Jira assignee
3. Review   review-implementation       run by the assigned reviewer: rerun gates, check pre-review artifacts
                                        ⛔ confirm → one GitHub review (APPROVE / REQUEST_CHANGES)
4. Merge    a person merges and moves the ticket to Done

2b. Wave    implement-bunch-ticket <plan.md> "Wave n"   alternative to 2–3 for a whole wave of a wave plan
                                        clarify once · ⛔ approve wave plan + Jira writes · Jira moves
                                        · TDD on one branch · gates + e2e + fresh-agent review · one PR
                                        · ⛔ a person merges (merge commit) and moves tickets to Done
```

`REQUEST_CHANGES` sends the PR back to `implement-ticket`, which resumes at Phase 4. Every new commit needs a new review. Agents never merge, push to `main`, or transition tickets; every agent write to Jira or GitHub is previewed and needs a yes (only exception: `implement-ticket` updating its own PR's evidence table and pre-review comment after the PR's creation was approved). A `REQUEST_CHANGES` review puts the PR back in Draft and starts a new pre-review cycle (up to 3 returns to implementation). Exception to all of this paragraph: `implement-bunch-ticket` (constitution: Wave delivery) moves its wave's tickets in Jira, comments on them, and opens its PR after the single plan approval.

| Skill                                                                                                                | Use for                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `create-implementation-item`                                                                                         | Stage 1. Scope a Jira ticket or an idea: context sweep, one question at a time, confirmed scoping summary, then a Jira `Story` with exactly one delivery label and one `Subtask` per area (`api`, `web`, `shared`, `db`), written only after Gate 1. No spec files.                                                                                                                                                                                                                                               |
| `implement-ticket`                                                                                                   | Stage 2. Deliver one Story: verify it against `main`, create `<type>/SCRUM-n-slug` and the spec dir, run Spec Kit, implement with TDD, run the gates, open a Draft PR, run the automated code review and Playwright e2e, mark it ready, and assign the reviewer. Resumable.                                                                                                                                                                                                                                       |
| `review-implementation`                                                                                              | Stage 3. Run by the assigned reviewer in their own session: rerun every gate on the head SHA, check the code-review comment and e2e specs, review against the Story, Spec Kit artifacts and constitution, return `APPROVED`/`REJECTED`, and post one GitHub review after confirmation. Report in `.tmp/reviews/`.                                                                                                                                                                                                 |
| `implement-bunch-ticket`                                                                                             | Alternative to stages 2–3 for a whole wave of a wave plan (`docs/plans/mvp-wave-plan.md`): one round of clarifications, one approved wave plan in `specs/wave-<n>-<slug>/`, Jira moves by the agent (active sprint, balanced assignees, In Progress → In Review, exception comment), TDD on `feat/wave-<n>-<slug>`, gates + e2e + fresh-agent review, one PR. Constitution: Wave delivery.                                                                                                                        |
| `speckit-*` (`specify`, `clarify`, `checklist`, `plan`, `tasks`, `analyze`, `implement`, `converge`, `constitution`) | Spec Kit lifecycle under `specs/<feature>/`, driven by `implement-ticket` Phase 3–4. `speckit-checklist` writes checklists a person ticks; with an item open, `speckit-implement` asks whether to continue and agents answer "no" and stop. `speckit-converge` appends unbuilt work to `tasks.md`. `create-new-feature.sh` creates the spec dir only, never a branch. Scripts find the feature through the git-ignored `.specify/feature.json`; in a fresh clone set `SPECIFY_FEATURE_DIRECTORY=specs/<feature>`. |

### Gates by delivery label

| Story label   | Spec Kit                                                                      | Unit gate                                                 | ≥80 % lines and branches on changed files | Code review on Draft PR | Playwright e2e               |
| ------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------- | ----------------------- | ---------------------------- |
| `feature`     | yes                                                                           | typecheck, lint, test                                     | yes                                       | yes                     | yes, when `apps/web` changes |
| `bug`         | yes, unless the fix only restores specified behaviour (Maintenance exemption) | typecheck, lint, test + a test that fails without the fix | no                                        | yes                     | no                           |
| `maintenance` | no (cite the Maintenance exemption)                                           | typecheck, lint, test                                     | no                                        | yes                     | no                           |

Commands: `pn typecheck`, `pn lint`, `pn test`, `pn test:coverage && pn coverage:changed`, `pn --filter @launchly/web test:e2e`. A gate whose command is missing blocks; it is never skipped. The code review uses the `code-review` skill plus `vercel-react-best-practices` and `docs/Frontend-Conventions.md` for `apps/web`, `docs/Backend-Conventions.md` for `apps/api`, and posts one PR comment starting `<!-- implement-ticket:code-review`. e2e specs live in `apps/web/e2e/scrum-<n>-<slug>.spec.ts`.

### Prerequisite tooling

Two gate commands do not exist yet. Until their tickets are merged, `implement-ticket` stops at those gates for `feature` Stories:

- `pn test:coverage` and `pn coverage:changed`: changed-file coverage tooling (ticket: not yet created).
- `pn --filter @launchly/web test:e2e`: Playwright harness for `apps/web` (ticket: not yet created).

Branches, commits, and PR titles carry the Jira key so the Jira–GitHub integration links them: branch `<type>/SCRUM-123-short-slug`, commit `<type>(<scope>): SCRUM-123 <summary>`, PR title `[SCRUM-123] <outcome>`.

## Jira workspace

- Site: `https://hcmut-team-vmaq1hvy.atlassian.net`
- Cloud ID (Atlassian MCP): `bec02efe-55db-40ac-a5fc-4b23fd1c1674`
- Project: **Launchly**, key `SCRUM` (team-managed software project)
- Issue types: `Epic`, `Story`, `Task`, `Subtask` (no `Bug` type; file a bug as a `Story` with the `bug` delivery label)
- Ticket URL: `https://hcmut-team-vmaq1hvy.atlassian.net/browse/<KEY>`
- Confluence is on the same site and may be read for requirements context.
