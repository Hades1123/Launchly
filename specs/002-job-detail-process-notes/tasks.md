# Implementation Tasks

## Phase DB (Database)
- [ ] Task 1.1: [FR-001] Add `format` and `estimatedDuration` fields to `JobStage` in `schema.prisma`.
- [ ] Task 1.2: [FR-002] Create `JobNote` model with relations and cascade delete in `schema.prisma`.
- [ ] Task 1.3: Generate migration and update seed fixtures with test job IDs (`...401`, `...402`, `...403`).
- [ ] Task 1.4: Resolve pre-existing MID/JUNIOR enum conflict in seed data.

## Phase API (Backend)
- [ ] Task 2.1: [FR-008, FR-004] Export `publicJobWhere` filtering helper in `jobs.service.ts`.
- [ ] Task 2.2: [FR-001, FR-002, FR-009] Implement public job detail query with ordered rounds and notes.
- [ ] Task 2.3: [FR-004, FR-005] Implement router `GET /api/jobs/:id` with parameter validation.
- [ ] Task 2.4: Export shared Zod schemas in `packages/shared/src/`.

## Phase Web (Frontend)
- [ ] Task 3.1: [FR-001, FR-006] Create hiring process timeline component with responsive vertical/grid layout.
- [ ] Task 3.2: [FR-002, FR-007] Create company notes card component.
- [ ] Task 3.3: [FR-003, FR-004] Integrate components into `/jobs/[id]` handling empty and 404 states.