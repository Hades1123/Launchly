# Implementation Plan: Candidate Profile and CV

**Branch**: `feat/SCRUM-24-candidate-profile-cv` | **Date**: 2026-11-07 | **Spec**: [spec.md](file:///e:/School/4thYear/Semester%201/CNPMNC/Launchly/specs/001-candidate-profile-cv/spec.md)

**Input**: Feature specification from `/specs/001-candidate-profile-cv/spec.md`

## Summary

Implement candidate profile management and single PDF CV document lifecycle (upload, replace, delete, and view) for Launchly.
The solution follows the repository constitution strictly: shared Zod schemas in `@launchly/shared`, a layered module in `apps/api/src/modules/candidate/`, a swappable `StorageProvider` in `apps/api/src/providers/storage/` (with `LocalStorageProvider` for development), strict server-side magic-byte and size verification, and owner-only access control.

## Technical Context

**Language/Version**: TypeScript ~6.0.3, Node.js 22 LTS

**Primary Dependencies**: Express 5, Prisma 7.10.1 (`@prisma/adapter-pg`), Next.js 15 (App Router), React 19, Tailwind CSS, Zod 3.x, Vitest, Supertest

**Storage**: PostgreSQL 17 (Prisma ORM on port 5433); private file storage abstracted behind `StorageProvider` (`LocalStorageProvider` using `apps/api/uploads/` in development, prepared for S3 driver in production)

**Testing**: Vitest (`pnpm test` / `pn --filter @launchly/api test`) with `supertest` for API route/service tests

**Target Platform**: Node.js backend (Linux/Windows/macOS), Modern web browsers (Next.js App Router)

**Project Type**: Monorepo with `apps/api`, `apps/web`, and `packages/shared`

**Performance Goals**: Profile retrieval and updates < 150ms p95; CV upload processing < 500ms for 5 MB files

**Constraints**: Maximum 5 MB per file; strict PDF magic bytes `%PDF-` validation; owner-only access (401/403 for unauthorized requests); zero orphaned files in storage

**Scale/Scope**: Single PDF per candidate in Sprint 1; scalable to multi-candidate profiles and future AI CV evaluation (SCRUM-19)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                        | Requirement                                                                                            | Compliance Status                                                              |
| :------------------------------- | :----------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------- |
| **I. Shared Contracts First**    | Request and response shapes defined as Zod schemas in `@launchly/shared`                               | Passed: Defined in `packages/shared/src/schemas/candidate-profile.ts`          |
| **II. Layered Modular Monolith** | Route -> Controller -> Service -> Prisma in `apps/api/src/modules/candidate/`; storage in `providers/` | Passed: Structured cleanly under `modules/candidate/` and `providers/storage/` |
| **III. Secure by Default**       | Magic bytes `%PDF-`, 5 MB limit, UUID storage names, owner-only authorization                          | Passed: Explicit validation at HTTP boundary; private streaming endpoint       |
| **IV. Tested Business Logic**    | Automated tests for success and failure paths with Vitest and supertest                                | Passed: Service, authorization, and storage tests specified                    |
| **V. Safe Data Evolution**       | Database changes through reviewable Prisma migrations only                                             | Passed: `CandidateProfile` created via `prisma migrate dev`                    |
| **VI. Simplicity**               | Minimal necessary implementation without speculative complexity                                        | Passed: Direct PostgreSQL array for skills, standard local disk driver for dev |

## Project Structure

### Documentation (this feature)

```text
specs/001-candidate-profile-cv/
├── spec.md              # Feature specification
├── plan.md              # Implementation plan (this file)
└── tasks.md             # Actionable dependency-ordered tasks
```

### Source Code (repository root)

```text
packages/shared/src/
├── schemas/
│   ├── auth.ts
│   ├── common.ts
│   └── candidate-profile.ts       # Shared Zod schemas & types for profile and CV
└── index.ts

apps/api/
├── prisma/
│   ├── schema.prisma              # CandidateProfile model with 1-to-1 User relation
│   └── migrations/                # Migration for candidate profile table
├── src/
│   ├── middlewares/
│   │   ├── auth.ts                # Pluggable candidate auth middleware (mock support for dev/test)
│   │   └── upload.ts              # Multer memory-storage / file upload middleware
│   ├── providers/
│   │   └── storage/
│   │       ├── storage.interface.ts # StorageProvider contract (save, delete, getStream)
│   │       ├── local-storage.provider.ts # Local disk implementation
│   │       └── index.ts           # Provider factory driven by STORAGE_DRIVER
│   ├── modules/
│   │   └── candidate/
│   │       ├── candidate.routes.ts     # Express routes with auth and validation
│   │       ├── candidate.controller.ts # HTTP request/response handling
│   │       ├── candidate.service.ts    # Business logic & Prisma operations
│   │       └── candidate.test.ts       # Vitest + supertest automated tests
│   └── app.ts                     # Mounts candidate router at /api/candidates

apps/web/src/
└── app/
    └── profile/
        ├── page.tsx               # Candidate profile view & edit form
        └── components/
            ├── profile-form.tsx   # Name, school, skills, projects form
            ├── cv-uploader.tsx    # Drag-and-drop / file selector with size/format checks
            └── cv-viewer.tsx      # Current CV metadata & delete confirmation dialog
```

**Structure Decision**: Monorepo layered architecture adhering strictly to Launchly Constitution Principles I, II, and III.

## Complexity Tracking

| Violation | Why Needed                                 | Simpler Alternative Rejected Because                           |
| :-------- | :----------------------------------------- | :------------------------------------------------------------- |
| None      | All principles satisfied without deviation | Direct DB manipulation rejected due to architecture principles |
