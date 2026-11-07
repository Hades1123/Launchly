# Engineering Plan: View Hiring Process and Company Notes

## Architecture & Phasing
- **Phase 1 (Database Subtask)**:
  - Write set: `apps/api/prisma/` (schema, migration, seed), `README.md`.
  - Add `format` and `estimatedDuration` to `JobStage`.
  - Add `JobNote` model with relation to `Job`.
  - Fix pre-existing `seed/data.ts` MID/JUNIOR typecheck errors.
- **Phase 2 (API Subtask)**:
  - Write set: `packages/shared/src/`, `apps/api/src/`, `docs/Backend-Conventions.md`.
  - Implement `publicJobWhere` helper.
  - Implement `GET /api/jobs/:id` route, service, and controller.
  - Shared Zod validation schemas (`publicJobDetailSchema`).
- **Phase 3 (Web Subtask)**:
  - Write set: `apps/web/src/`.
  - Build vertical/grid timeline component for rounds.
  - Build company notes card.
  - Replace mock data integration on `/jobs/[id]`.

## Constitution Check
- Follows Spec Kit requirements for all new functionality.
- Web testing adheres to Assumption A8: verified via static checks (`next build`, `lint`, `typecheck`) and manual viewport checks.
