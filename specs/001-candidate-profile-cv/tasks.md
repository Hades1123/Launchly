# Tasks: Candidate Profile and CV

**Input**: Design documents from `/specs/001-candidate-profile-cv/`

**Prerequisites**: [spec.md](file:///e:/School/4thYear/Semester%201/CNPMNC/Launchly/specs/001-candidate-profile-cv/spec.md), [plan.md](file:///e:/School/4thYear/Semester%201/CNPMNC/Launchly/specs/001-candidate-profile-cv/plan.md)

**Tests**: Tests are mandatory per Constitution Principle IV (TDD red-green-refactor with Vitest and supertest).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (independent files, no blocking dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup & Foundational Prerequisites

**Purpose**: Core shared types, database schema, storage abstraction, and auth middleware

- [x] T001 [P] Define CandidateProfile and CV Zod schemas and inferred types in `packages/shared/src/schemas/candidate-profile.ts` and export them from `packages/shared/src/index.ts`.
- [x] T002 [P] Create `CandidateProfile` model with 1-to-1 `User` relation in `apps/api/prisma/schema.prisma`.
- [x] T003 [P] Implement `StorageProvider` interface (`save`, `delete`, `getStream`) in `apps/api/src/providers/storage/storage.interface.ts`, implement `LocalStorageProvider` in `apps/api/src/providers/storage/local-storage.provider.ts`, and ensure `apps/api/uploads/` is added to `.gitignore`.
- [x] T004 [P] Create pluggable candidate authentication middleware in `apps/api/src/middlewares/auth.ts` supporting development/test mock fallback (`x-mock-user-id`).
- [x] T005 [P] Create file upload middleware in `apps/api/src/middlewares/upload.ts` with memory storage and 5 MB size limit.

---

## Phase 2: User Story 1 - Basic Profile Information Management (Priority: P1)

**Goal**: Enable candidate to view and update full name, school/major, skills, and projects/activities.

**Independent Test**: Candidate updates profile fields via `PUT /api/candidates/profile`; verify persistence via `GET /api/candidates/profile` and rejection of empty full name.

### Tests for User Story 1
- [x] T006 [US1] Write automated tests in `apps/api/src/modules/candidate/candidate.test.ts` for profile retrieval and update (success path, empty full name validation failure, unauthorized access).

### Implementation for User Story 1
- [x] T007 [US1] Implement `CandidateService.getProfile` and `CandidateService.updateProfile` in `apps/api/src/modules/candidate/candidate.service.ts` updating `User.fullName` and `CandidateProfile` fields.
- [x] T008 [US1] Implement `CandidateController` and `apps/api/src/modules/candidate/candidate.routes.ts`, and mount router at `/api/candidates` in `apps/api/src/app.ts`.
- [x] T009 [US1] Execute tests and verify Green status for User Story 1.

---

## Phase 3: User Story 2 - Upload Single PDF CV (Priority: P1)

**Goal**: Enable candidate to upload a single PDF CV (< 5 MB) verified by content type and magic bytes.

**Independent Test**: Candidate uploads valid PDF; verify file is stored, metadata linked, and invalid formats or oversized files are rejected.

### Tests for User Story 2
- [x] T010 [US2] Write automated tests in `apps/api/src/modules/candidate/candidate.test.ts` for `POST /api/candidates/cv` (valid PDF, >5 MB error, spoofed non-PDF magic byte rejection).

### Implementation for User Story 2
- [x] T011 [US2] Implement magic-byte PDF validator function checking `%PDF-` prefix in `apps/api/src/modules/candidate/cv-validator.ts`.
- [x] T012 [US2] Implement `CandidateService.uploadCv` in `apps/api/src/modules/candidate/candidate.service.ts` to validate magic bytes, save file via `StorageProvider`, and update profile metadata.
- [x] T013 [US2] Add `POST /api/candidates/cv` route and controller handler in `candidate.routes.ts` and `candidate.controller.ts`.
- [x] T014 [US2] Execute tests and verify Green status for User Story 2.

---

## Phase 4: User Story 3 - Replace and Delete CV (Priority: P2)

**Goal**: Enable candidate to replace their CV (cleaning up old physical file) or delete it with confirmation.

**Independent Test**: Upload new CV over existing one, assert old file is removed from disk; delete CV, assert file is removed and profile metadata is null.

### Tests for User Story 3
- [x] T015 [US3] Write automated tests in `apps/api/src/modules/candidate/candidate.test.ts` for replacing CV (verifying old storage file deletion) and `DELETE /api/candidates/cv`.

### Implementation for User Story 3
- [x] T016 [US3] Update `CandidateService.uploadCv` to detect existing CV, invoke `storageProvider.delete()`, and replace cleanly.
- [x] T017 [US3] Implement `CandidateService.deleteCv` to remove file via `storageProvider.delete()` and nullify CV fields in database.
- [x] T018 [US3] Add `DELETE /api/candidates/cv` route and controller handler.
- [x] T019 [US3] Execute tests and verify Green status for User Story 3.

---

## Phase 5: User Story 4 - Owner-Only CV Privacy (Priority: P1)

**Goal**: Restrict CV file access and streaming strictly to the owning candidate.

**Independent Test**: Send `GET /api/candidates/cv` as owner (200 stream), as another candidate (403 forbidden), and unauthenticated (401).

### Tests for User Story 4
- [x] T020 [US4] Write automated tests in `apps/api/src/modules/candidate/candidate.test.ts` for owner access (success), non-owner access (403), and missing CV (404).

### Implementation for User Story 4
- [x] T021 [US4] Implement `CandidateService.getCvStream` in `apps/api/src/modules/candidate/candidate.service.ts` with ownership check and file stream retrieval.
- [x] T022 [US4] Add `GET /api/candidates/cv` route and controller handler with appropriate streaming headers (`Content-Type: application/pdf`).
- [x] T023 [US4] Execute tests and verify Green status for User Story 4.

---

## Phase 6: Frontend UI Implementation

**Purpose**: Responsive candidate profile and CV management UI in Next.js

- [x] T024 [P] Build `ProfileForm` component in `apps/web/src/app/profile/components/profile-form.tsx` utilizing shared Zod schema.
- [x] T025 [P] Build `CvUploader` component in `apps/web/src/app/profile/components/cv-uploader.tsx` with client-side 5 MB limit and PDF check.
- [x] T026 [P] Build `CvViewer` component in `apps/web/src/app/profile/components/cv-viewer.tsx` with download button and delete confirmation modal.
- [x] T027 Combine components into responsive page at `apps/web/src/app/profile/page.tsx`.

---

## Phase 7: Verification and Quality Gates

**Purpose**: Complete verification across the monorepo

- [x] T028 Run `pn typecheck` across all packages.
- [x] T029 Run `pn lint` at repository root.
- [x] T030 Run full test suite with `pn test`.
