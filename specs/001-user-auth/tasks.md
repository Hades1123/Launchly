# Tasks: User Authentication and Authorization

**Input**: Design documents from `specs/001-user-auth/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/auth.openapi.yaml, quickstart.md

**Tests**: Required by the project constitution for all business logic, shared schemas, and authorization behavior. Write tests before the corresponding implementation and record red/green results.

**Organization**: Tasks are grouped by the five user stories from `spec.md`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because files and prerequisites do not overlap.
- **[Story]**: User-story traceability label; setup and foundational tasks omit it.
- Every task names the source or test file(s) it changes.

## Phase 1: Setup

**Purpose**: Add required dependencies, persistence shape, shared contracts, and provider infrastructure.

- [X] T001 Add auth/provider dependencies and validate API mail, Google, and frontend-link environment settings in `apps/api/package.json`, `apps/api/src/lib/env.ts`, and `apps/api/.env.example`; update `pnpm-lock.yaml`. The root `.env.example` remains the existing pointer to app-specific examples.
- [X] T002 [P] Add account verification/lock fields, nullable `fullName`, `AuthToken` with `EMAIL_VERIFICATION`, `PASSWORD_RESET`, and `GOOGLE_ACCOUNT_LINK` purposes, and `AuthSession` to `apps/api/prisma/schema.prisma`; create a new forward-only migration under `apps/api/prisma/migrations/` and regenerate `apps/api/src/generated/prisma/`.
- [X] T003 [P] Define auth request, response, role, user DTO, and shared error Zod schemas with inferred types in `packages/shared/src/schemas/auth.ts` and export them from `packages/shared/src/index.ts`.
- [X] T004 Implement the mail-provider interface plus SMTP and SES providers in `apps/api/src/providers/mail/mail-provider.ts`; fail explicitly for incomplete provider configuration and require TLS for SMTP.

## Phase 2: Foundational

**Purpose**: Establish request validation, error responses, dependency injection, and auth-module boundaries before user-story work.

- [X] T005 Implement shared request validation and the consistent `{ error: { code, message, details? } }` response format in `apps/api/src/middlewares/validate.ts`, `apps/api/src/middlewares/error-handler.ts`, and `packages/shared/src/schemas/common.ts`.
- [X] T006 Create the injectable auth-service/provider boundary and mount auth routes in `apps/api/src/modules/auth/auth.service.ts`, `apps/api/src/modules/auth/auth.routes.ts`, and `apps/api/src/app.ts`; enable tests to supply fake Prisma/provider dependencies without contacting live services.

**Checkpoint**: Shared contracts, schema migration, providers, error handling, and auth test seams are ready.

## Phase 3: User Story 1 - Register and verify an account (Priority: P1) 🎯 MVP

**Goal**: Register Candidate/Recruiter accounts as unverified, send one-time verification links, and activate only after valid confirmation.

**Independent Test**: Register a new account, verify it using a fake mail provider's captured link, and confirm duplicate, invalid, expired, reused, and delivery-failure cases.

### Tests for User Story 1

- [X] T007 [P] [US1] Write shared registration/verification schema tests in `packages/shared/src/schemas/auth.test.ts` for invalid email/password/role and rejected `ADMIN` self-registration.
- [X] T008 [P] [US1] Write auth service and route tests in `apps/api/src/modules/auth/auth.registration.test.ts` for registration, normalized duplicate email, verification success/expiry/reuse, resend invalidation, and mail-provider failure leaving no account or usable token.

### Implementation for User Story 1

- [X] T009 [US1] Implement password hashing primitives and hashed, expiring, single-use verification-token creation/consumption in `apps/api/src/modules/auth/auth.crypto.ts` and `apps/api/src/modules/auth/auth.service.ts`; normalize email to lowercase, never persist raw tokens or passwords, and roll back the new account/token if verification email delivery fails.
- [X] T010 [US1] Implement register, verify-email, and resend-verification controllers and routes in `apps/api/src/modules/auth/auth.controller.ts` and `apps/api/src/modules/auth/auth.routes.ts`; use shared schemas and send 24-hour verification links through the mail interface.
- [X] T011 [US1] Run the focused shared/API registration tests and record GREEN results; ensure failed email delivery leaves no account or usable token and is not reported as successful in `apps/api/src/modules/auth/auth.registration.test.ts`.

**Checkpoint**: Registration and verification work independently with an injected mail provider.

## Phase 4: User Story 2 - Sign in and manage an authenticated session (Priority: P1)

**Goal**: Allow verified, unlocked users to sign in, rotate credentials, read their own account, and invalidate sessions at logout.

**Independent Test**: Sign in with valid credentials, refresh once, read `/auth/me`, log out, and verify both old access and refresh credentials are rejected.

### Tests for User Story 2

- [X] T012 [P] [US2] Write service and route tests in `apps/api/src/modules/auth/auth.session.test.ts` for correct/incorrect passwords, unverified/locked accounts, refresh rotation/reuse, logout revocation, and `/auth/me`.

### Implementation for User Story 2

- [X] T013 [US2] Implement credential verification, short-lived JWT access tokens, opaque refresh-token hashing/rotation, session creation, logout revocation, and session revocation after password changes in `apps/api/src/modules/auth/auth.service.ts` and `apps/api/src/modules/auth/auth.crypto.ts`.
- [X] T014 [US2] Implement bearer-token authentication middleware and secure refresh-cookie handling in `apps/api/src/middlewares/authenticate.ts` and `apps/api/src/modules/auth/auth.controller.ts`; check persisted session/user lock state on every protected request.
- [X] T015 [US2] Add login, logout, refresh, and `/auth/me` routes plus endpoint-specific login throttling in `apps/api/src/modules/auth/auth.routes.ts` and `apps/api/src/middlewares/auth-rate-limit.ts`; set an httpOnly, SameSite=Lax cookie scoped to `/auth` and Secure in production.
- [X] T016 [US2] Run focused session tests and record GREEN results in `apps/api/src/modules/auth/auth.session.test.ts`; confirm logout immediately revokes the access-token session.

**Checkpoint**: Verified, unlocked users can authenticate, refresh, inspect their mapped user DTO, and revoke their sessions.

## Phase 5: User Story 5 - Access role-appropriate features (Priority: P1)

**Goal**: Require a valid active session and enforce Candidate, Recruiter, or Admin authorization on protected routes.

**Independent Test**: Exercise a protected fixture route without credentials and with each role; only permitted roles receive protected content.

### Tests for User Story 5

- [X] T017 [P] [US5] Write authentication/role-guard tests in `apps/api/src/middlewares/authorize.test.ts` for missing, expired, revoked, locked, allowed-role, and forbidden-role sessions.

### Implementation for User Story 5

- [X] T018 [US5] Implement typed user context and role authorization middleware in `apps/api/src/middlewares/authenticate.ts` and `apps/api/src/middlewares/authorize.ts`; return 401 for unauthenticated requests and 403 for disallowed roles without protected payloads.
- [X] T019 [US5] Run focused authorization tests and record GREEN results in `apps/api/src/middlewares/authorize.test.ts`; ensure current database role and lock state are used rather than stale JWT role claims.

**Checkpoint**: Protected API routes can consistently apply server-side role guards.

## Phase 6: User Story 3 - Sign in with Google (Priority: P2)

**Goal**: Verify Google ID tokens, require role selection for first-time users, and link existing accounts only under the clarified proof policy.

**Independent Test**: Use a fake verifier for invalid identities, role selection, existing linked users, Gmail/Workspace matching, and non-Gmail/Workspace email confirmation.

### Tests for User Story 3

- [X] T020 [P] [US3] Write Google sign-in and account-link tests in `apps/api/src/modules/auth/auth.google.test.ts` for invalid/unverified tokens, first-time role selection, existing linked accounts, safe-domain linking, external-domain email challenge, expiry, reuse, and provider failure.

### Implementation for User Story 3

- [X] T021 [US3] Implement Google ID-token verification with configured audience and verified `sub`, email, and hosted-domain claims in `apps/api/src/providers/google/google.provider.ts`; never trust client-decoded identity claims.
- [X] T022 [US3] Implement Google registration, first-time role selection, existing-account linking, and 30-minute email confirmation bound to Google subject in `apps/api/src/modules/auth/auth.service.ts` and `apps/api/src/modules/auth/auth.crypto.ts`.
- [X] T023 [US3] Add `/auth/google` and `/auth/google/complete-link` controller/routes in `apps/api/src/modules/auth/auth.controller.ts` and `apps/api/src/modules/auth/auth.routes.ts`; issue sessions only after role selection or successful required email confirmation.
- [X] T024 [US3] Run focused Google tests and record GREEN results in `apps/api/src/modules/auth/auth.google.test.ts`; verify no session/account link is created on failed verification.

**Checkpoint**: Google identity verification cannot be bypassed and new accounts cannot self-select ADMIN.

## Phase 7: User Story 4 - Recover account access (Priority: P2)

**Goal**: Provide non-enumerating password recovery with a 30-minute, one-time token and revoke all sessions after reset.

**Independent Test**: Compare registered/unregistered recovery responses, consume one reset link, then verify expiry/reuse rejection and session revocation.

### Tests for User Story 4

- [X] T025 [P] [US4] Write recovery service and route tests in `apps/api/src/modules/auth/auth.password-reset.test.ts` for equal responses, delivery failures, token expiry/reuse, password replacement, throttling, and prior-session revocation.

### Implementation for User Story 4

- [X] T026 [US4] Implement forgot-password and reset-password token lifecycle, indistinguishable external recovery responses, 30-minute expiry, and atomic one-time consumption in `apps/api/src/modules/auth/auth.service.ts`.
- [X] T027 [US4] Add recovery routes and forgot-password/resend-verification throttling in `apps/api/src/modules/auth/auth.controller.ts` and `apps/api/src/modules/auth/auth.routes.ts`; avoid logging email addresses, raw tokens, or reset URLs.
- [X] T028 [US4] Run focused recovery tests and record GREEN results in `apps/api/src/modules/auth/auth.password-reset.test.ts`; verify every prior session is rejected after reset.

**Checkpoint**: Recovery does not expose account existence and reset credentials cannot be reused.

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Align documentation and environment examples, then validate the full feature.

- [X] T029 Update `apps/api/.env.example` and `specs/001-user-auth/quickstart.md` with final provider settings and runnable validation commands; the root `.env.example` remains the pointer to app-specific examples.
- [X] T030 Run migration validation, `pn typecheck`, `pn lint`, `pn test`, and `pn --filter @launchly/api build`; fix auth-feature regressions without editing the existing migration in `apps/api/prisma/migrations/20261102150334_init/migration.sql`.
- [X] T031 Validate endpoint paths and security boundaries against `specs/001-user-auth/contracts/auth.openapi.yaml` and `specs/001-user-auth/spec.md`; record remaining environment-dependent provider checks in the task evidence.

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001–T003 are independent; T004 depends on T001.
- **Foundational (Phase 2)**: T005 and T006 follow shared contracts and provider setup; blocks all user stories.
- **User stories (Phases 3–7)**: Execute in sequence because registration, sessions, Google identity, recovery, and authorization share the auth service and persisted session model. Tests within each story precede that story's implementation.
- **Polish (Phase 8)**: Depends on all five user stories.

### User Story Dependencies

- **US1 (P1)**: Starts after foundational setup; establishes account registration, email verification, and shared one-time-token primitives.
- **US2 (P1)**: Depends on US1 account lifecycle and adds session primitives used by Google and role authorization.
- **US5 (P1)**: Depends on US2 authentication/session validation.
- **US3 (P2)**: Depends on US1 token/email support and US2 session creation.
- **US4 (P2)**: Depends on US1 one-time-token handling and US2 session revocation.

### Parallel Opportunities

- T002 (Prisma model/migration) and T003 (shared schemas) can run in parallel after setup begins.
- T007/T008 are independent test files; T017, T020, and T025 are independent test files once their prerequisites exist.
- Different user stories are not parallelizable in this implementation because they modify the same auth service/routes and rely on prior story behavior.

## Implementation Strategy

1. Complete dependency, contract, migration, and provider setup.
2. Deliver US1 as the MVP: registration and email verification, tested independently.
3. Add US2 sessions and logout; validate immediate invalidation before continuing.
4. Add US5 role guards, then Google sign-in/account linking and recovery.
5. Run the full repository gates and check the resulting API against the OpenAPI contract and acceptance criteria.

## Notes

- `[P]` means files and prerequisites are independent; no parallel marker is used for work on the shared auth service or routes.
- Keep all tokens, passwords, SMTP credentials, and Google secrets out of logs and responses.
- Use only a local/disposable PostgreSQL database for migrations and integration checks; never run `migrate reset` or `db push`.
- Verification evidence: full workspace tests pass (71 API, 4 shared); `pn typecheck`, `pn lint`, API build, Prisma generate, and Prisma validate pass. RED-stage test output was not captured before implementation in this resumed worktree.
- Not exercised against live services: applying the migration to PostgreSQL, SMTP/SES delivery, and Google OAuth credentials. Configure these from `apps/api/.env.example` and validate with the scenarios in `quickstart.md` before deployment.
