# Project memory: Launchly

Snapshot of core architectural decisions, invariants, and technical dead-ends.

## Invariant constraints
- Strict read-only workspace safety: agents must never edit or create files without explicit, unambiguous user command.
- Strict deletion confirmation: never delete files without pausing and requesting explicit confirmation.
- Language policy: all code, schemas, comments, docstrings, error messages, and tests must be in English.
- Text formatting: no icons or emojis in any response, code, comment, or report. Headings must follow sentence case.

## Architectural decisions
- Monorepo stack: Next.js 16 (web), Express 5 (api), PostgreSQL 17 with Prisma 7, Zod schemas in `@launchly/shared`.
- Database modeling:
  - `Resume` is an independent model linked 1:N to `CandidateProfile`.
  - `Application` and `AiAssessment` reference `Resume.id` (`resumeId`), never raw file paths.
  - `CandidateProfile` holds personal and fresher info (`schoolMajor`, `skills`, `projectsActivities`) alongside professional overview (`headline`, `bio`, `location`).
- API error contract:
  - Unified error format `{ error: { code: ErrorCode, message: string, details?: ErrorDetail[] } }`.
  - Handled via `AppError` (`apps/api/src/lib/app-error.ts`) and `errorHandler`.
- Storage provider:
  - Swappable `StorageProvider` interface (`apps/api/src/providers/storage/`).
  - Local disk storage for dev, AWS S3 for production. Never store sensitive files with raw user-supplied names; generate random storage keys.
- Frontend design:
  - Semantic tokens from Stitch "Career Launch Engine" in `globals.css` (`bg-primary`, `bg-surface`, `rounded-control`, `rounded-card`).
  - Reusable UI primitives: `Button`, `Card`, `Badge` in `apps/web/src/components/ui/`.

## Technical gotchas and dead-ends
- Node.js version constraint: Prisma 7 CLI and dev dependencies require Node.js 22.12+ (or Node 22.3 with `--experimental-require-module`). When running Prisma generation on Node 22.3, pass `$env:NODE_OPTIONS="--experimental-require-module"`.
- Dependency installation: pnpm 12 lifecycle scripts block unapproved builds; allowed scripts are listed under `onlyBuiltDependencies` in `package.json`. Use `pn install --ignore-scripts` if preinstall checks fail on Node version mismatches.
- Migration integrity: Never edit committed migrations or generate conflicting local migrations that duplicate table creation.
