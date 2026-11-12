<!--
Sync Impact Report
==================
Version change: 2.0.0 → 2.1.0
Bump rationale: MINOR. Adds the Wave delivery bullet (implement-bunch-ticket skill) and references
it as an exception in Review, Human ownership and Remote writes. Rules defined by the team; no
separate approval.
Templates and docs checked:
  - AGENTS.md ⚠ skill row, flow line and exception note added (same change set)
  - .claude/skills/implement-bunch-ticket ⚠ new

Previous entry
--------------
Version change: 1.2.0 → 2.0.0
Bump rationale: MAJOR. Development Workflow and Quality Gates is redefined around three skills
(create-implementation-item, implement-ticket, review-implementation). The review gate moves from
an agent-only verdict to a reviewer-run review posted on GitHub, and Human ownership gains a
reviewer-assignment exception. Both change what earlier versions required.

Modified principles:
  - IV. Tested Business Logic: adds the changed-file coverage gate (feature tickets) and the
    Playwright e2e gate (feature tickets touching apps/web); drops the outdated "no tests exist"
    rationale.
Modified sections:
  - Development Workflow and Quality Gates:
    - New Scoping and Delivery labels bullets (feature / bug / maintenance).
    - Maintenance exemption keyed to the `maintenance` label.
    - Local gates extended with `pn coverage:changed` and `pn --filter @launchly/web test:e2e`.
    - New Pre-review bullet: Draft PR, automated code review posted as a PR comment, at most 3
      fix rounds.
    - Review: the assigned reviewer runs review-implementation, which reruns the gates and posts
      one GitHub review after the reviewer confirms it.
    - Human ownership: agents may set the Jira assignee and PR reviewers for a person the user
      named in that run.
Added sections: none
Removed sections: none

Templates and docs checked:
  - .specify/templates/*.md ✅ no change needed
  - AGENTS.md ⚠ rewritten for workflow v2 (same change set)
  - CONTRIBUTING.md ⚠ Workflow section updated (same change set)
  - .claude/skills/create-implementation-item ⚠ new; replaces create-implementation-issue and
    publish-jira-issue (removed)
  - .claude/skills/implement-ticket ⚠ new
  - .claude/skills/review-implementation ⚠ reruns gates and posts the GitHub review

Follow-up TODOs:
  - `pn coverage:changed` and `pn --filter @launchly/web test:e2e` do not exist yet; they are
    delivered by two prerequisite maintenance tickets. Until then implement-ticket halts at the
    gate that needs them.
  - No CI exists; the gates are enforced locally by implement-ticket and again in review.
-->

# Launchly Constitution

## Core Principles

### I. Shared Contracts First

Every request and response shape crossing the web/API boundary MUST be defined once as a Zod schema
in `@launchly/shared`, with TypeScript types derived via `z.infer`.

- The API MUST validate incoming requests (body, params, query) against the shared schema before
  the controller hands data to a service.
- The web app MUST reuse the same schemas for forms and response typing; it MUST NOT redeclare
  equivalent types by hand.
- Prisma models and generated Prisma types MUST NOT be exported to, imported by, or serialized
  unmapped to the frontend. Services map Prisma records to shared DTOs.
- `@launchly/shared` stays source-only (no build step). A change that breaks an existing schema
  MUST be flagged as breaking (`!` / `BREAKING CHANGE:`) and update both apps in the same PR.

**Rationale**: one schema gives compile-time types and runtime validation in both apps, so the two
can never silently disagree; keeping persistence types server-side prevents leaking fields such as
password hashes and avoids `Date`/ISO-string mismatches.

### II. Layered Modular Monolith

The API is one deployable Express application, split by business feature under
`apps/api/src/modules/<feature>/`, and every feature follows route → controller → service →
Prisma.

- Routes declare paths, middleware (auth, role guard, validation) and the controller only.
- Controllers translate HTTP to service calls and back; they MUST NOT contain business rules or
  call Prisma directly.
- Services own business logic and data access. Cross-feature calls go through the other module's
  service, not its Prisma queries.
- Swappable infrastructure (storage: local/S3, mail: SMTP/SES, and similar future integrations)
  lives in `providers/` behind an interface selected by configuration (`STORAGE_DRIVER`,
  `MAIL_DRIVER`). Business code MUST depend on the interface, never on a vendor SDK.
- The backend is the only component that talks to PostgreSQL and to external services. The browser
  reaches the API only through the Next.js `/api/*` rewrite; server components MAY call `API_URL`
  directly.
- Same-app imports use the `@/` alias, not relative `../` paths.

**Rationale**: a small team with limited time needs one predictable shape for every feature, so
adding or changing a module never reshapes the system, and switching dev/deploy infrastructure is a
configuration change rather than a code change.

### III. Secure by Default

Security controls are part of a feature's definition of done, not a later hardening pass.

- Secrets (JWT secrets, OAuth client secrets, Gemini, SMTP/SES, S3 credentials) live only in the
  API environment and MUST NOT reach the web bundle, logs, or API responses.
- Authentication uses a short-lived JWT access token plus a refresh token in an httpOnly cookie.
  Google OAuth results MUST be verified on the backend.
- Authorization MUST be enforced server-side on every protected route by role (`CANDIDATE`,
  `RECRUITER`, `ADMIN`) and by resource ownership where applicable. Hiding UI is not access control.
- All external input is untrusted: validated with Zod at the boundary; uploads checked by magic
  bytes (not extension), size-limited, stored under random (UUID) names, and never served directly
  from the storage folder. File reads re-check permission.
- AI (Gemini) output MUST be requested as structured JSON and re-validated with Zod before it is
  stored or shown. AI endpoints MUST have timeouts and rate limits.
- Errors returned to clients use one consistent error format and MUST NOT expose stack traces,
  SQL, or internal identifiers beyond what the client needs.

**Rationale**: Launchly stores personal data (CVs, applications, contact details) for three roles
with different rights; a missed check is a data leak, not a cosmetic bug.

### IV. Tested Business Logic

Behaviour that carries business rules MUST ship with automated tests in the same PR.

- Test runner is Vitest in every package; API endpoint tests use `supertest`.
- New or changed service logic, authorization rules, and shared schemas MUST have tests covering
  the success path and the main failure paths (invalid input, forbidden role, not found).
- Every bug fix MUST include a test that fails without the fix.
- Changes to observable behaviour MUST follow red → green → refactor: write a focused test, run it
  and record the failure caused by the missing behaviour (a setup or compile error is not RED),
  implement the minimum that makes it pass, then refactor only while tests stay green. The RED and
  GREEN output is recorded in the PR or task evidence.
- Pure UI layout and configuration-only changes are exempt but MUST still pass typecheck and lint.
- Tickets labelled `feature` MUST reach at least 80 % line coverage and 80 % branch coverage on
  every changed source file (`src/**`, excluding tests, generated code, and type declarations),
  checked with `pn test:coverage` followed by `pn coverage:changed`.
- Tickets labelled `feature` whose diff touches `apps/web` MUST add Playwright end-to-end specs in
  `apps/web/e2e/` covering each acceptance criterion and edge case the UI exposes, and
  `pn --filter @launchly/web test:e2e` MUST pass. API-only features rely on supertest endpoint
  tests.
- Tickets labelled `bug` or `maintenance` are exempt from the coverage and e2e gates; a `bug` still
  needs the failing-first test above.

**Rationale**: there is no CI, so these gates are enforced locally by the implementing agent and
again by the reviewer; without them, regressions in auth and role checks surface only in demos.

### V. Safe Data Evolution

The database schema changes only through committed, reviewable Prisma migrations.

- Schema changes go through `prisma migrate dev`, and the generated migration folder is committed
  with the schema change. Production applies them with `prisma migrate deploy`.
- Committed migrations MUST NOT be edited; corrections ship as a new migration.
- `migrate reset` and `db push` MUST NOT be run against any shared database. The API MUST NOT
  migrate on startup.
- Environment variables are validated with Zod at startup (`lib/env.ts`) and the API fails fast on
  invalid configuration. `.env.example` files are kept current; `.env` files are never committed.

**Rationale**: migrations are the only shared history of the data model; editing or bypassing
them desynchronises teammates' databases and risks losing real data.

### VI. Simplicity and Pinned Dependencies

Choose the simplest design that satisfies the current, specified requirement.

- New dependencies, packages, services, or abstraction layers MUST be justified by a concrete need
  in the spec or plan. Speculative generality (YAGNI) is rejected in review.
- Tooling stays minimal until a measured problem appears (e.g. no Turborepo while `pnpm -r` and
  `--filter` suffice).
- Versions with known compatibility limits stay pinned (TypeScript `~6.0.3`, Prisma `7.10.1`)
  until the blocking constraint is lifted and the upgrade is done deliberately in its own PR.
- Any deviation from Principles I–VI MUST be recorded in the plan's Complexity Tracking with the
  simpler alternative that was rejected and why.

**Rationale**: the team is small and time-boxed; every extra moving part costs setup, review, and
debugging time that should go to features.

## Technology and Platform Constraints

- **Monorepo**: pnpm workspace with `apps/web`, `apps/api`, `packages/shared`; package scope
  `@launchly/*`. Use `pn` (alias of `pnpm`) from the repo root.
- **Runtime**: Node.js 22 LTS, pnpm 12. Dependency build scripts are allowed only for packages
  listed under `allowBuilds` in `pnpm-workspace.yaml`.
- **Frontend**: Next.js (App Router) with React and Tailwind CSS; responsive and usable on mobile.
- **Backend**: Express 5 REST API with JSON payloads, TypeScript, run with `tsx` in dev and bundled
  with `tsup` for production.
- **Data**: PostgreSQL 17 via Prisma 7 with the `PrismaPg` driver adapter; datasource URL in
  `apps/api/prisma.config.ts`; client generated to `apps/api/src/generated/prisma` (git-ignored).
  Local Postgres is exposed on host port 5433.
- **External services**: file storage (local → S3 private bucket), email (Gmail SMTP → Amazon SES),
  Gemini API, Google OAuth 2.0, each reached only from the API.
- **Code style**: ESLint flat config and Prettier at the root; LF line endings everywhere.
- **Documentation**: all docs, specs, plans, and code comments are written in English.

Changing any item in this section (adding a framework, swapping a provider, unpinning a version)
requires a plan that states the reason and is reviewed like an architecture change.

## Development Workflow and Quality Gates

- **Tracking**: work is traced to a Jira issue in project `SCRUM`. Branches use
  `<type>/SCRUM-123-short-slug`; commits use Conventional Commits with the Jira key,
  `<type>(<scope>): SCRUM-123 <summary>`, scopes `api`, `web`, `shared`, `db`, `deps`; PR titles
  use `[SCRUM-123] <outcome>`.
- **Scoping**: new work is scoped with the `create-implementation-item` skill. It produces a Jira
  `Story` (business level) with one `Subtask` per touched area (`api`, `web`, `shared`, `db`) and
  writes to Jira only after a person approves the exact writes it lists (its Gate 1).
- **Delivery labels**: every Story carries exactly one of `feature`, `bug`, or `maintenance`. The
  label decides which gates apply (Principle IV, Maintenance exemption). Delivery runs through the
  `implement-ticket` skill on the Story key: one branch, one Spec Kit feature, one PR.
- **Wave delivery**: tickets listed in one wave of a wave plan (`docs/plans/*.md`) MAY be delivered
  together by the `implement-bunch-ticket` skill. For those tickets: one branch
  `feat/wave-<n>-<slug>` and one PR may carry several Jira keys (commits stay per key); one wave
  plan at `specs/wave-<n>-<slug>/plan.md`, approved by the person who ran the skill, replaces the
  full Spec Kit chain; the agent MAY add the tickets to the active sprint, set balanced assignees,
  transition them To Do → In Progress → In Review, and comment on them without further previews;
  the gates run as in Local gates, except that a missing coverage command is recorded as not
  available; an independent review by a fresh agent that did not write the code, plus green gates
  and e2e, satisfies Review. Each ticket gets a Jira comment stating it was delivered under this
  exception. These rules are defined by the team and need no separate approval.
- **Spec-driven features**: every change that adds or alters behaviour follows the Spec Kit flow
  under `specs/<feature>/` (specify → clarify → checklist → plan → tasks → analyze → human approval
  → implement). The git branch and the spec directory are named independently: the branch follows
  Tracking, the directory is created by `.specify/scripts/bash/create-new-feature.sh`. The plan's Constitution Check MUST pass, or list justified exceptions in Complexity
  Tracking, before tasks are generated. Every CRITICAL analyze finding and every open checklist item
  MUST be resolved before implement starts. Only a person may tick a checklist item or override an
  open one; an autonomous agent asked whether to proceed with open checklist items MUST answer
  "no" and stop.
- **Maintenance exemption**: behaviour-preserving maintenance MAY skip Spec Kit. This covers
  refactors with no observable change, dependency updates within pinned ranges, tooling, lint,
  formatting, and documentation fixes, and bug fixes that restore already specified behaviour. The
  Story MUST carry the `maintenance` label (or `bug` for a restoring fix) and cite this rule, and
  its acceptance criteria become the execution contract. If the scope grows to new or changed
  behaviour, work stops and enters the Spec Kit flow.
- **Local gates**: before pushing, `pn typecheck`, `pn lint`, and `pn test` MUST pass; for `feature`
  tickets also `pn test:coverage && pn coverage:changed`, and for `feature` tickets touching
  `apps/web` also `pn --filter @launchly/web test:e2e` (Principle IV). A gate whose command does not
  exist yet blocks; it is never skipped. Commits stay small and each leaves the project buildable.
- **Pre-review**: the implementing agent opens the PR as a Draft, runs an automated code review of
  the diff (Next.js/React best practices and `docs/Frontend-Conventions.md` for `apps/web`,
  `docs/Backend-Conventions.md` for `apps/api`), and posts the result as one PR comment for the
  head commit. Critical or Important findings and e2e failures send the work back to
  implementation, at most 3 rounds; after that the agent halts under the Checkpoint exemption.
  Exception: Wave delivery (the fresh-agent review runs before the PR is opened and is recorded in
  the PR body; the PR opens ready for review, or as a Draft after a halt).
- **Checkpoint exemption**: an agent that halts on a terminal failure, size limit, or turn ceiling
  MAY push one checkpoint commit that leaves the project unbuildable, only to a PR that stays in
  Draft. The commit still uses the Jira-keyed format, for example
  `chore(api): SCRUM-123 checkpoint before halt`. A PR that contains a checkpoint commit is
  squash-merged, so the checkpoint never reaches `main` on its own.
- **Review**: every change reaches `main` through a pull request with an independent review on the
  final head commit of a PR that is ready for review; Draft PRs are not reviewed. The assigned
  reviewer runs the `review-implementation` skill in their own session (never the session that
  wrote the code). It reruns every applicable gate on the head commit, checks the pre-review comment
  and the e2e specs, returns `APPROVED` or `REJECTED`, and checks compliance with this
  constitution. A `REJECTED` verdict lists the violated principle, requirement, or failing gate with
  the minimum fix. After the reviewer confirms the exact text, it posts one GitHub review
  (`APPROVE` or `REQUEST_CHANGES`). A new commit needs a new review. Exception: Wave delivery.
- **Human ownership**: people approve ticket writes, hand work to agents, approve plans, choose
  reviewers, merge PRs, and transition tickets. Agents MUST NOT merge, push to `main`, or transition
  tickets unless explicitly told to. Exception: `implement-ticket` may set the Jira assignee and the
  PR reviewers for the person the user named in that run, after the user confirms the preview.
  Exception: Wave delivery.
- **Remote writes**: every agent write to Jira or GitHub (create, edit, comment, review) is shown
  as an exact preview first and runs only on a yes given while that preview is on screen.
  Exception: once a person approved creating a PR, the implementing agent may update that PR's
  own evidence table, plan-approval line, and pre-review comment in the same shape without a new
  preview. Exception: Wave delivery.

## Governance

This constitution supersedes conflicting guidance in other project documents. `AGENTS.md` and
`CONTRIBUTING.md` provide day-to-day runtime guidance and MUST be kept consistent with it; where
they disagree, this document wins and the other file is corrected.

- **Amendments**: proposed through a pull request that edits `.specify/memory/constitution.md`
  (normally via `/speckit-constitution`), states the reason, and lists affected templates or docs.
  An amendment requires approval from at least one team member other than the author before merge.
- **Versioning**: semantic versioning. MAJOR for removing or redefining a principle in a backward
  incompatible way; MINOR for adding a principle or section or materially expanding guidance;
  PATCH for clarifications and wording fixes. `Last Amended` is updated on every change.
- **Compliance**: every plan runs the Constitution Check; every PR review verifies the principles
  touched by the change. Unjustified violations are grounds for `REJECTED`. The team reviews the
  constitution at least once per milestone and amends it when practice has drifted.

**Version**: 2.1.0 | **Ratified**: 2026-11-04 | **Last Amended**: 2026-11-12
