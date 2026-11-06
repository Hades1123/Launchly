<!--
Sync Impact Report
==================
Version change: 1.1.0 → 1.2.0
Bump rationale: MINOR. Development Workflow and Quality Gates adds a checkpoint-commit exemption
and makes the checklist gate binding on autonomous agents. Both materially expand guidance; no
principle is removed.

Modified principles: none
Modified sections:
  - Development Workflow and Quality Gates:
    - Spec-driven features: only a person may tick or override checklist items; an agent asked to
      proceed with open items MUST answer "no" and stop.
    - New Checkpoint exemption: one unbuildable, Jira-keyed checkpoint commit is allowed on a
      Draft PR at fail-fast halt; such PRs are squash-merged.
    - Review: runs on PRs ready for review; Draft PRs are not reviewed.
Added sections: none
Removed sections: none

Templates and docs checked:
  - .specify/templates/*.md ✅ no change needed
  - AGENTS.md ✅ checklist gate wording aligned with this amendment
  - CONTRIBUTING.md ✅ commit format unchanged; checkpoint uses the normal format
  - .claude/skills/create-implementation-issue (SKILL.md, issue template) ✅ checkpoint message
    and checklist step aligned
  - .claude/skills/review-implementation ✅ skips Draft PRs, size rule aligned

Follow-up TODOs:
  - No tests and no CI exist yet; Principle IV and the quality gates are enforced locally and in
    review until CI is added.
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

**Rationale**: no tests exist yet and there is no CI, so the habit has to be set from the first
feature; otherwise regressions in auth and role checks will surface only in demos.

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
- **Spec-driven features**: every change that adds or alters behaviour follows the Spec Kit flow
  under `specs/<feature>/` (specify → clarify → checklist → plan → tasks → analyze → human approval
  → implement). The plan's Constitution Check MUST pass, or list justified exceptions in Complexity
  Tracking, before tasks are generated. Every CRITICAL analyze finding and every open checklist item
  MUST be resolved before implement starts. Only a person may tick a checklist item or override an
  open one; an autonomous agent asked whether to proceed with open checklist items MUST answer
  "no" and stop.
- **Maintenance exemption**: behaviour-preserving maintenance MAY skip Spec Kit. This covers
  refactors with no observable change, dependency updates within pinned ranges, tooling, lint,
  formatting, and documentation fixes, and bug fixes that restore already specified behaviour. The
  Jira issue MUST cite this rule, and its acceptance criteria become the execution contract. If the
  scope grows to new or changed behaviour, work stops and enters the Spec Kit flow.
- **Local gates**: before pushing, `pn typecheck`, `pn lint`, and `pn test` MUST pass. Commits stay
  small and each leaves the project buildable.
- **Checkpoint exemption**: an agent that halts on a terminal failure, size limit, or turn ceiling
  MAY push one checkpoint commit that leaves the project unbuildable, only to a PR that stays in
  Draft. The commit still uses the Jira-keyed format, for example
  `chore(api): SCRUM-123 checkpoint before halt`. A PR that contains a checkpoint commit is
  squash-merged, so the checkpoint never reaches `main` on its own.
- **Review**: every change reaches `main` through a pull request with an independent review (the
  `review-implementation` skill, run in a session that did not write the code) on the final head
  commit of a PR that is ready for review; Draft PRs are not reviewed. It returns `APPROVED` or `REJECTED` and checks compliance with this constitution. A
  `REJECTED` verdict lists the violated principle, requirement, or failing gate with the minimum fix.
  A new commit needs a new review.
- **Human ownership**: people approve issue drafts, publish tickets, hand work to agents, merge
  PRs, and transition tickets. Agents MUST NOT merge, push to `main`, or transition tickets unless
  explicitly told to.

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

**Version**: 1.2.0 | **Ratified**: 2026-11-04 | **Last Amended**: 2026-11-06
