# Feature Specification: Candidate Profile and CV

**Feature Branch**: `feat/SCRUM-24-candidate-profile-cv`

**Created**: 2026-11-07

**Status**: Draft

**Input**: User description: "SCRUM-24 Candidate Profile and CV"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Basic Profile Information Management (Priority: P1)

As a candidate (intern or fresher), I want to create and update my basic profile information including my full name, school or major, list of skills, and projects or activities, so that recruiters can review my background.

**Why this priority**: Core identity feature for candidates on the platform; necessary baseline before applying to jobs or undergoing evaluation.

**Independent Test**: A signed-in candidate can view and submit their profile with full name, school/major, skills, and projects/activities, and verify that all fields persist accurately on reload.

**Acceptance Scenarios**:

1. **Given** a signed-in candidate on the profile page, **When** they update and submit valid information (full name, school/major, skills list, projects/activities), **Then** the updated data is saved and persisted across page reloads.
2. **Given** a signed-in candidate, **When** they attempt to save the profile with an empty or whitespace-only full name, **Then** the system rejects the update with a validation error indicating that full name is required, and does not alter existing data.

---

### User Story 2 - Upload Single PDF CV (Priority: P1)

As a candidate, I want to upload my CV as a single PDF file (under 5 MB), so that my resume is ready for job applications.

**Why this priority**: Required for candidate recruitment workflows; serves as input for future AI CV evaluation (Epic SCRUM-19).

**Independent Test**: A signed-in candidate can choose a valid PDF (< 5 MB), upload it, and see the uploaded CV metadata (file name, upload timestamp) displayed on their profile.

**Acceptance Scenarios**:

1. **Given** a signed-in candidate without a CV, **When** they select and upload a valid PDF file under 5 MB, **Then** the file is securely stored, the candidate profile reflects the uploaded file, and a success confirmation is displayed.
2. **Given** a signed-in candidate, **When** they attempt to upload a file exceeding 5 MB, **Then** the system rejects the upload with a clear size limit error before persisting to storage.
3. **Given** a signed-in candidate, **When** they attempt to upload a non-PDF file or a file with a spoofed `.pdf` extension whose magic bytes do not match `%PDF-`, **Then** the system rejects the file with a format validation error.

---

### User Story 3 - Replace and Delete CV (Priority: P2)

As a candidate with an existing CV, I want to replace my current CV with an updated PDF or delete it with a confirmation step, so that I always maintain control over my uploaded documents.

**Why this priority**: Essential document lifecycle management; prevents keeping obsolete or unwanted personal documents on the platform.

**Independent Test**: A candidate can upload a replacement PDF and verify the new document replaces the old one with the old storage file cleaned up; a candidate can delete their CV after confirming a warning prompt.

**Acceptance Scenarios**:

1. **Given** a candidate with an existing CV, **When** they upload a new valid PDF, **Then** the new CV replaces the old one in their profile, and the previous physical file is deleted from storage without leaving orphaned files.
2. **Given** a candidate with an existing CV, **When** they initiate deletion and confirm the action, **Then** the CV file is removed from private storage and the profile updates to show no CV uploaded.
3. **Given** a candidate with an existing CV, **When** they initiate deletion but cancel the confirmation prompt, **Then** the CV remains intact in storage and on their profile.

---

### User Story 4 - Owner-Only CV Privacy (Priority: P1)

As a candidate, I want my CV file to be private by default, so that only I can view or download it during this sprint.

**Why this priority**: Strict privacy constraint defined in the ticket; Launchly handles sensitive personal candidate data.

**Independent Test**: Sending a download request for candidate A's CV using candidate B's credentials or an unauthenticated session returns a 403 Forbidden or 401 Unauthorized response.

**Acceptance Scenarios**:

1. **Given** a signed-in candidate who owns a CV, **When** they request to view or download their CV, **Then** the system streams the file or issues an authorized temporary stream.
2. **Given** a user who is not the owner of the CV (unauthenticated or another candidate), **When** they attempt to access the CV endpoint, **Then** the system denies access with an authorization error.

---

### Edge Cases

- What happens if the network drops midway through a multi-megabyte CV upload? The server discards incomplete chunks and does not update the candidate profile record.
- What happens if file deletion from storage fails during a replace or delete operation? The service logs the storage error and reports a failure rather than desynchronizing the database and physical storage state.
- What happens if a user submits a profile with an excessively long skills list or unexpected characters? Validation enforces max item counts and sanitizes strings.
- What happens if concurrent upload requests occur for the same candidate? The system serializes updates and ensures only the latest valid document is retained.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide an endpoint to retrieve the current candidate's profile and CV metadata.
- **FR-002**: System MUST allow updating `fullName`, `schoolMajor`, `skills` (list of strings), and `projectsActivities` for the authenticated candidate.
- **FR-003**: System MUST reject empty or whitespace-only `fullName` updates.
- **FR-004**: System MUST accept CV uploads only in PDF format (`application/pdf`) and verify file magic bytes starting with `%PDF-`.
- **FR-005**: System MUST enforce a maximum file size limit of 5 MB (5,242,880 bytes) on both the client-side and server-side.
- **FR-006**: System MUST store CV files in private storage behind a swappable `StorageProvider` abstraction, storing files under random UUID keys rather than user-supplied filenames.
- **FR-007**: System MUST immediately purge old physical files from storage whenever a CV is replaced or deleted.
- **FR-008**: System MUST require explicit user confirmation before executing CV deletion.
- **FR-009**: System MUST restrict CV download and access exclusively to the owning candidate in this sprint.
- **FR-010**: System MUST define all request and response payloads as Zod schemas in `@launchly/shared` and reuse them across frontend and backend.

### Key Entities

- **User**: Core authentication identity model containing `id`, `email`, `fullName`, and `role`.
- **CandidateProfile**: Dedicated entity linked 1-to-1 with `User` via `userId`. Holds `schoolMajor` (string, nullable), `skills` (string array), `projectsActivities` (text, nullable), `cvFilePath` (string, nullable), `cvOriginalFileName` (string, nullable), and `cvUploadedAt` (timestamp, nullable).
- **CVFile**: Storage abstraction metadata representing the private stored file (`storageKey`, `mimeType`, `sizeBytes`, `originalFileName`).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of uploaded files are verified by magic bytes; zero non-PDF files can be persisted.
- **SC-002**: 100% of orphaned storage files are eliminated upon CV replacement or deletion.
- **SC-003**: Profile retrieval and update API response times average under 150 ms in local testing.
- **SC-004**: Unauthorized access requests to any candidate's CV file achieve a 100% rejection rate.
- **SC-005**: All new business logic, storage abstraction, and validation rules pass automated tests with 100% green status.

## Assumptions

- Candidate role authentication is assumed to be active on the route; during parallel development with SCRUM-23, an authentication middleware abstraction supporting mock user contexts will be used for testing and development.
- Storage driver defaults to `local` disk storage in development (`apps/api/uploads/`, git-ignored) and conforms to `StorageProvider` interface for seamless future S3 deployment.
- Recruiter access to applicant CVs is explicitly out of scope for this sprint (scheduled for Sprint 2 with E-03).
- Only a single PDF CV is supported per candidate in this sprint (multi-CV support is out of scope).
